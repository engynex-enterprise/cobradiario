import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { allocatePayment, type AllocatableInstallment } from '@cobradiario/credit-engine';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../realtime/events.gateway';
import { AuthContext } from '../common/types';
import { RegisterPaymentInput } from './payments.inputs';
import { RegisterPaymentResult, PaymentModel } from './payments.models';
import { toInstallmentModel } from '../loans/loans.service';
import { LoanModel } from '../loans/loans.models';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Registra un abono sobre un crédito:
   *  - Idempotente por clientRequestId (tolera reintentos offline sin doble cobro).
   *  - Bloquea la fila del crédito (SELECT ... FOR UPDATE) para evitar carreras.
   *  - Asigna el pago a cuotas en orden FIFO (motor de crédito).
   *  - Persiste Payment + PaymentAllocation[] + actualiza cuotas/crédito + LedgerEntry.
   *  - Emite evento realtime `payment.registered` al tenant.
   */
  async registerPayment(
    auth: AuthContext,
    input: RegisterPaymentInput,
  ): Promise<RegisterPaymentResult> {
    const { tenantId, userId } = auth;

    // Idempotencia: si ya existe un pago con esta clave, se devuelve el resultado previo.
    if (input.clientRequestId) {
      const existing = await this.prisma.payment.findUnique({
        where: { tenantId_clientRequestId: { tenantId, clientRequestId: input.clientRequestId } },
      });
      if (existing) {
        const loan = await this.loadLoanModel(tenantId, existing.loanId);
        return {
          payment: toPaymentModel(existing),
          applied: Number(existing.amount),
          leftover: 0,
          loan,
        };
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de la fila del crédito dentro de la transacción.
      await tx.$executeRaw`SELECT id FROM loans WHERE id = ${input.loanId} AND "tenantId" = ${tenantId} FOR UPDATE`;

      const loan = await tx.loan.findFirst({
        where: { id: input.loanId, tenantId, deletedAt: null },
      });
      if (!loan) throw new NotFoundException('Crédito no encontrado');
      if (loan.status === 'PAID') {
        throw new BadRequestException('El crédito ya está pagado');
      }

      const installments = await tx.installment.findMany({
        where: { tenantId, loanId: loan.id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        orderBy: { sequence: 'asc' },
      });

      const allocatable: AllocatableInstallment[] = installments.map((it) => ({
        id: it.id,
        sequence: it.sequence,
        dueDate: it.dueDate,
        amount: Number(it.amount),
        lateFee: Number(it.lateFee),
        paidAmount: Number(it.paidAmount),
      }));

      const alloc = allocatePayment(allocatable, input.amount);
      if (alloc.applied <= 0) {
        throw new BadRequestException('El crédito no tiene saldo pendiente para aplicar');
      }

      const payment = await tx.payment.create({
        data: {
          tenantId,
          loanId: loan.id,
          collectorId: userId,
          amount: alloc.applied,
          method: input.method,
          status: 'COMPLETED',
          note: input.note,
          latitude: input.latitude,
          longitude: input.longitude,
          clientRequestId: input.clientRequestId,
          allocations: {
            create: alloc.allocations.map((a) => ({
              tenantId,
              installmentId: a.installmentId,
              amount: a.amount,
            })),
          },
        },
      });

      // Actualiza cada cuota tocada.
      for (const u of alloc.updated) {
        await tx.installment.update({
          where: { id: u.id },
          data: {
            paidAmount: u.paidAmount,
            status: u.status,
            paidAt: u.status === 'PAID' ? new Date() : null,
          },
        });
      }

      // Actualiza el crédito.
      const newPaid = new Prisma.Decimal(loan.paidAmount).plus(alloc.applied);
      const newBalance = new Prisma.Decimal(loan.balance).minus(alloc.applied);
      const isPaid = newBalance.lte(0);
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          paidAmount: newPaid,
          balance: newBalance.lt(0) ? new Prisma.Decimal(0) : newBalance,
          status: isPaid ? 'PAID' : loan.status,
          closedAt: isPaid ? new Date() : null,
        },
        include: { installments: { orderBy: { sequence: 'asc' } } },
      });

      // Ledger: ingreso por cobro.
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          loanId: loan.id,
          type: 'PAYMENT',
          amount: new Prisma.Decimal(alloc.applied),
          balanceAfter: updatedLoan.balance,
          reference: payment.id,
        },
      });

      return { payment, updatedLoan, applied: alloc.applied, leftover: alloc.leftover };
    });

    const loanModel = mapLoan(result.updatedLoan);

    // Evento realtime (fuera de la transacción). Best-effort.
    this.events.emitToTenant(tenantId, 'payment.registered', {
      paymentId: result.payment.id,
      loanId: result.updatedLoan.id,
      amount: result.applied,
      balance: loanModel.balance,
      status: loanModel.status,
    });

    return {
      payment: toPaymentModel(result.payment),
      applied: result.applied,
      leftover: result.leftover,
      loan: loanModel,
    };
  }

  list(tenantId: string, loanId: string) {
    return this.prisma.payment
      .findMany({
        where: { tenantId, loanId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      .then((rows) => rows.map(toPaymentModel));
  }

  private async loadLoanModel(tenantId: string, loanId: string): Promise<LoanModel> {
    const loan = await this.prisma.loan.findFirstOrThrow({
      where: { id: loanId, tenantId },
      include: { installments: { orderBy: { sequence: 'asc' } } },
    });
    return mapLoan(loan);
  }
}

// --- Mappers ---
type LoanWithInstallments = Prisma.LoanGetPayload<{ include: { installments: true } }>;

function mapLoan(loan: LoanWithInstallments): LoanModel {
  return {
    id: loan.id,
    code: loan.code ?? undefined,
    status: loan.status,
    clientId: loan.clientId,
    productId: loan.productId,
    routeId: loan.routeId ?? undefined,
    principal: Number(loan.principal),
    interestTotal: Number(loan.interestTotal),
    totalDue: Number(loan.totalDue),
    paidAmount: Number(loan.paidAmount),
    balance: Number(loan.balance),
    disbursedAt: loan.disbursedAt ?? undefined,
    firstDueDate: loan.firstDueDate ?? undefined,
    createdAt: loan.createdAt,
    installments: loan.installments.map(toInstallmentModel),
  };
}

function toPaymentModel(p: Prisma.PaymentGetPayload<object>): PaymentModel {
  return {
    id: p.id,
    loanId: p.loanId,
    amount: Number(p.amount),
    method: p.method,
    status: p.status,
    note: p.note ?? undefined,
    latitude: p.latitude ?? undefined,
    longitude: p.longitude ?? undefined,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}
