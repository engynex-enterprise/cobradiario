import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  /** Construye los términos a partir de lo definido al crear el crédito. */
  private termsFromInput(input: CreateLoanInput): CreditTerms {
    return {
      interestMethod: (input.interestMethod ?? 'FLAT') as CreditTerms['interestMethod'],
      interestRate: input.interestRate ?? 0,
      rateBasis: (input.rateBasis ?? 'PER_LOAN') as CreditTerms['rateBasis'],
      frequency: (input.frequency ?? 'DAILY') as CreditTerms['frequency'],
      termCount: input.termCount as number,
      graceDays: 0,
      lateFeeType: (input.lateFeeType ?? 'NONE') as CreditTerms['lateFeeType'],
      lateFeeValue: input.lateFeeValue ?? 0,
      roundingMode: 'NEAREST',
      roundTo: 1,
      nonPayDays: input.nonPayDays ?? [],
      config: {},
    };
  }

  /**
   * Crea un crédito: genera el plan de cuotas con el motor y persiste
   * Loan + Installment[] + LedgerEntry (desembolso) en una transacción.
   * Los términos se congelan como snapshot en loan.terms.
   *
   * Los términos se definen al crear el crédito (cuotas, interés, mora). Si se
   * pasa `productId`, se usa como plantilla (retrocompatibilidad).
   */
  async createLoan(tenantId: string, input: CreateLoanInput): Promise<LoanModel> {
    const db = this.prisma.forTenant(tenantId);
    const client = await db.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    let terms: CreditTerms;
    if (input.productId) {
      const product = await db.creditProduct.findFirst({ where: { id: input.productId, deletedAt: null } });
      if (!product) throw new NotFoundException('Producto de crédito no encontrado');
      terms = this.termsFromProduct(product);
    } else {
      if (!input.termCount || input.termCount < 1) {
        throw new BadRequestException('Debes indicar la cantidad de cuotas');
      }
      terms = this.termsFromInput(input);
    }

    const firstDueDate = input.firstDueDate ?? new Date();
    const schedule = generateSchedule({ principal: input.principal, firstDueDate, terms });
    const code = genLoanCode();

    // Cargos adicionales: se distribuyen entre las cuotas (la última absorbe el redondeo)
    // manteniendo el invariante cuota = capital + interés + cargo. Suman al total y saldo.
    const charges = (input.charges ?? []).filter((c) => c.amount > 0);
    const chargesTotal = round2(charges.reduce((s, c) => s + c.amount, 0));
    const n = schedule.installments.length;
    const chargePer = n > 0 ? round2(chargesTotal / n) : 0;
    const termsSnapshot = { ...terms, charges, chargesTotal } as unknown as Prisma.InputJsonValue;

    const loan = await this.prisma.$transaction(async (tx) => {
      await this.prisma.setTenantGuc(tx, tenantId); // RLS dentro de la transacción
      const created = await tx.loan.create({
        data: {
          tenantId,
          code,
          clientId: input.clientId,
          productId: input.productId,
          routeId: input.routeId,
          status: 'ACTIVE',
          principal: schedule.principal,
          interestTotal: schedule.interestTotal,
          totalDue: round2(schedule.totalDue + chargesTotal),
          paidAmount: 0,
          balance: round2(schedule.totalDue + chargesTotal),
          terms: termsSnapshot,
          guarantor: input.guarantor ? (input.guarantor as unknown as Prisma.InputJsonValue) : undefined,
          disbursedAt: new Date(),
          firstDueDate,
        },
      });

      let accumCharge = 0;
      await tx.installment.createMany({
        data: schedule.installments.map((it, i) => {
          const isLast = i === n - 1;
          const chargePart = isLast ? round2(chargesTotal - accumCharge) : chargePer;
          accumCharge = round2(accumCharge + chargePart);
          return {
            tenantId,
            loanId: created.id,
            sequence: it.sequence,
            dueDate: it.dueDate,
            amount: round2(it.amount + chargePart),
            principalPart: it.principalPart,
            interestPart: it.interestPart,
            chargePart,
          };
        }),
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
        include: { installments: { orderBy: { sequence: 'asc' } }, client: true, route: true },
      });
    });

    return toLoanModel(loan);
  }

  /** Edita monto/fecha de una cuota (solo si no tiene abonos) y recalcula el total/saldo del crédito. */
  async updateInstallment(tenantId: string, input: { id: string; amount?: number; dueDate?: Date }): Promise<LoanModel> {
    const db = this.prisma.forTenant(tenantId);
    const inst = await db.installment.findFirst({ where: { id: input.id } });
    if (!inst) throw new NotFoundException('Cuota no encontrada');
    if (Number(inst.paidAmount) > 0) {
      throw new BadRequestException('No se puede editar una cuota que ya tiene abonos');
    }

    const loanId = inst.loanId;
    await this.prisma.$transaction(async (tx) => {
      await this.prisma.setTenantGuc(tx, tenantId);
      const data: { amount?: Prisma.Decimal; dueDate?: Date } = {};
      if (input.amount !== undefined) data.amount = new Prisma.Decimal(round2(input.amount));
      if (input.dueDate !== undefined) data.dueDate = input.dueDate;
      await tx.installment.updateMany({ where: { id: input.id }, data });

      // Recalcula total y saldo del crédito a partir de la suma de cuotas.
      const rows = await tx.installment.findMany({ where: { loanId }, select: { amount: true, paidAmount: true } });
      const totalDue = round2(rows.reduce((s, r) => s + Number(r.amount), 0));
      const paid = round2(rows.reduce((s, r) => s + Number(r.paidAmount), 0));
      await tx.loan.updateMany({ where: { id: loanId }, data: { totalDue, balance: round2(totalDue - paid) } });
    });

    return this.findById(tenantId, loanId);
  }

  async findById(tenantId: string, id: string): Promise<LoanModel> {
    const loan = await this.prisma.forTenant(tenantId).loan.findFirst({
      where: { id, deletedAt: null },
      include: { installments: { orderBy: { sequence: 'asc' } }, client: true, route: true },
    });
    if (!loan) throw new NotFoundException('Crédito no encontrado');
    return toLoanModel(loan);
  }

  async list(tenantId: string, routeId?: string): Promise<LoanModel[]> {
    const loans = await this.prisma.forTenant(tenantId).loan.findMany({
      where: { deletedAt: null, ...(routeId ? { routeId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { client: true, route: true },
    });
    return loans.map((l) => toLoanModel(l));
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Código legible del crédito: YYMMDD-XXX (fecha + sufijo base36). */
function genLoanCode(): string {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const suffix = Math.floor(Math.random() * 46655) // 36^3 - 1
    .toString(36)
    .toUpperCase()
    .padStart(3, '0');
  return `${yy}${mm}${dd}-${suffix}`;
}

// --- Mappers Prisma → GraphQL (Decimal → number) ---
type LoanWithRels = Prisma.LoanGetPayload<{
  include: { client: true; route: true };
}> & { installments?: Prisma.InstallmentGetPayload<object>[] };

function toLoanModel(loan: LoanWithRels | Prisma.LoanGetPayload<object>): LoanModel {
  const l = loan as LoanWithRels & { terms?: Partial<CreditTerms> };
  const terms = (l.terms ?? {}) as Partial<CreditTerms>;
  return {
    id: l.id,
    code: l.code ?? undefined,
    status: l.status,
    clientId: l.clientId,
    clientName: l.client?.fullName,
    productId: l.productId ?? undefined,
    routeId: l.routeId ?? undefined,
    routeName: l.route?.name,
    principal: Number(l.principal),
    interestTotal: Number(l.interestTotal),
    totalDue: Number(l.totalDue),
    paidAmount: Number(l.paidAmount),
    balance: Number(l.balance),
    termCount: terms.termCount,
    interestRate: terms.interestRate,
    interestMethod: terms.interestMethod as LoanModel['interestMethod'],
    frequency: terms.frequency as LoanModel['frequency'],
    lateFeeValue: terms.lateFeeValue,
    chargesTotal: (terms as { chargesTotal?: number }).chargesTotal,
    guarantor: (l as unknown as { guarantor?: LoanModel['guarantor'] }).guarantor ?? undefined,
    disbursedAt: l.disbursedAt ?? undefined,
    firstDueDate: l.firstDueDate ?? undefined,
    createdAt: l.createdAt,
    installments: l.installments?.map(toInstallmentModel),
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
    chargePart: Number(it.chargePart),
    lateFee: Number(it.lateFee),
    paidAmount: Number(it.paidAmount),
  };
}
