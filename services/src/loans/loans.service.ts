import { Injectable, NotFoundException } from '@nestjs/common';
import { CreditProduct, Prisma } from '@prisma/client';
import { generateSchedule, type CreditTerms } from '@cobradiario/credit-engine';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanInput } from './loans.inputs';
import { InstallmentModel, LoanModel } from './loans.models';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Construye los términos del motor a partir del producto (snapshot). */
  private termsFromProduct(product: CreditProduct): CreditTerms {
    return {
      interestMethod: product.interestMethod,
      interestRate: Number(product.interestRate),
      rateBasis: product.rateBasis,
      frequency: product.frequency,
      termCount: product.termCount,
      graceDays: product.graceDays,
      lateFeeType: product.lateFeeType,
      lateFeeValue: Number(product.lateFeeValue),
      roundingMode: product.roundingMode,
      roundTo: Number(product.roundTo),
      config: (product.config ?? {}) as Record<string, unknown>,
    };
  }

  /**
   * Crea un crédito: genera el plan de cuotas con el motor y persiste
   * Loan + Installment[] + LedgerEntry (desembolso) en una transacción.
   * Los términos se congelan como snapshot en loan.terms.
   */
  async createLoan(tenantId: string, input: CreateLoanInput): Promise<LoanModel> {
    const [client, product] = await Promise.all([
      this.prisma.client.findFirst({
        where: { id: input.clientId, tenantId, deletedAt: null },
      }),
      this.prisma.creditProduct.findFirst({
        where: { id: input.productId, tenantId, deletedAt: null },
      }),
    ]);
    if (!client) throw new NotFoundException('Cliente no encontrado');
    if (!product) throw new NotFoundException('Producto de crédito no encontrado');

    const terms = this.termsFromProduct(product);
    const firstDueDate = input.firstDueDate ?? new Date();
    const schedule = generateSchedule({ principal: input.principal, firstDueDate, terms });

    const loan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          tenantId,
          clientId: input.clientId,
          productId: input.productId,
          routeId: input.routeId,
          status: 'ACTIVE',
          principal: schedule.principal,
          interestTotal: schedule.interestTotal,
          totalDue: schedule.totalDue,
          paidAmount: 0,
          balance: schedule.totalDue,
          terms: terms as unknown as Prisma.InputJsonValue,
          disbursedAt: new Date(),
          firstDueDate,
        },
      });

      await tx.installment.createMany({
        data: schedule.installments.map((it) => ({
          tenantId,
          loanId: created.id,
          sequence: it.sequence,
          dueDate: it.dueDate,
          amount: it.amount,
          principalPart: it.principalPart,
          interestPart: it.interestPart,
        })),
      });

      // Ledger: desembolso (egreso de caja del prestamista).
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          loanId: created.id,
          type: 'DISBURSEMENT',
          amount: new Prisma.Decimal(schedule.principal).negated(),
          reference: created.id,
        },
      });

      return tx.loan.findUniqueOrThrow({
        where: { id: created.id },
        include: { installments: { orderBy: { sequence: 'asc' } } },
      });
    });

    return toLoanModel(loan);
  }

  async findById(tenantId: string, id: string): Promise<LoanModel> {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { installments: { orderBy: { sequence: 'asc' } } },
    });
    if (!loan) throw new NotFoundException('Crédito no encontrado');
    return toLoanModel(loan);
  }

  async list(tenantId: string, routeId?: string): Promise<LoanModel[]> {
    const loans = await this.prisma.loan.findMany({
      where: { tenantId, deletedAt: null, ...(routeId ? { routeId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return loans.map((l) => toLoanModel(l));
  }
}

// --- Mappers Prisma → GraphQL (Decimal → number) ---
type LoanWithInstallments = Prisma.LoanGetPayload<{ include: { installments: true } }>;

function toLoanModel(loan: LoanWithInstallments | Prisma.LoanGetPayload<object>): LoanModel {
  const anyLoan = loan as LoanWithInstallments;
  return {
    id: anyLoan.id,
    code: anyLoan.code ?? undefined,
    status: anyLoan.status,
    clientId: anyLoan.clientId,
    productId: anyLoan.productId,
    routeId: anyLoan.routeId ?? undefined,
    principal: Number(anyLoan.principal),
    interestTotal: Number(anyLoan.interestTotal),
    totalDue: Number(anyLoan.totalDue),
    paidAmount: Number(anyLoan.paidAmount),
    balance: Number(anyLoan.balance),
    disbursedAt: anyLoan.disbursedAt ?? undefined,
    firstDueDate: anyLoan.firstDueDate ?? undefined,
    createdAt: anyLoan.createdAt,
    installments: anyLoan.installments?.map(toInstallmentModel),
  };
}

export function toInstallmentModel(
  it: Prisma.InstallmentGetPayload<object>,
): InstallmentModel {
  return {
    id: it.id,
    sequence: it.sequence,
    status: it.status,
    dueDate: it.dueDate,
    amount: Number(it.amount),
    principalPart: Number(it.principalPart),
    interestPart: Number(it.interestPart),
    lateFee: Number(it.lateFee),
    paidAmount: Number(it.paidAmount),
  };
}
