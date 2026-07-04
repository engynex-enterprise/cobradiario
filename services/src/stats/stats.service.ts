import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Balances, DashboardStats, FinancialSummary } from './stats.models';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string): Promise<DashboardStats> {
    const db = this.prisma.forTenant(tenantId);

    // Límites de día en UTC para que `collectedToday` y los buckets diarios (por fecha UTC)
    // sean consistentes. Refinamiento futuro: usar la zona horaria del tenant (Tenant.timezone).
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6); // hoy + 6 días atrás = 7 días

    const [activeAgg, todayAgg, overdue, byStatus, recentPayments] = await Promise.all([
      db.loan.aggregate({ where: { status: 'ACTIVE', deletedAt: null }, _sum: { balance: true }, _count: true }),
      db.payment.aggregate({ where: { createdAt: { gte: startOfToday } }, _sum: { amount: true } }),
      db.installment.count({ where: { status: 'OVERDUE' } }),
      db.loan.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true, _sum: { balance: true } }),
      db.payment.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { amount: true, createdAt: true },
      }),
    ]);

    // Serie diaria de recaudo (últimos 7 días), rellenando días sin cobros con 0.
    const buckets = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(sevenDaysAgo.getUTCDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const p of recentPayments) {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, round2(buckets.get(key)! + Number(p.amount)));
    }

    return {
      totalPortfolio: round2(Number(activeAgg._sum.balance ?? 0)),
      collectedToday: round2(Number(todayAgg._sum.amount ?? 0)),
      activeLoans: activeAgg._count,
      overdueInstallments: overdue,
      portfolioByStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        balance: round2(Number(s._sum.balance ?? 0)),
      })),
      collectionLast7Days: [...buckets.entries()].map(([date, amount]) => ({ date, amount })),
    };
  }

  async balances(tenantId: string): Promise<Balances> {
    const db = this.prisma.forTenant(tenantId);

    const agg = await db.loan.aggregate({
      where: { deletedAt: null },
      _sum: { principal: true, totalDue: true, paidAmount: true, balance: true },
    });

    const grouped = await db.payment.groupBy({
      by: ['collectorId'],
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    const collectorIds = grouped.map((g) => g.collectorId).filter((x): x is string => !!x);
    const users = collectorIds.length
      ? await db.user.findMany({ where: { id: { in: collectorIds } }, select: { id: true, fullName: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));

    const byCollector = grouped
      .filter((g) => g.collectorId)
      .map((g) => ({
        collectorId: g.collectorId as string,
        collectorName: nameById.get(g.collectorId as string),
        collected: round2(Number(g._sum.amount ?? 0)),
        payments: g._count,
      }))
      .sort((a, b) => b.collected - a.collected);

    return {
      totalPrincipal: round2(Number(agg._sum.principal ?? 0)),
      totalDue: round2(Number(agg._sum.totalDue ?? 0)),
      totalPaid: round2(Number(agg._sum.paidAmount ?? 0)),
      outstanding: round2(Number(agg._sum.balance ?? 0)),
      byCollector,
    };
  }

  /**
   * Resumen financiero de un período [from, to). Agrega actividad (nº abonos/créditos),
   * distribución de ingresos cobrados (capital/interés/mora, prorrateado por allocation),
   * medios de pago y desembolsos.
   */
  async financialSummary(tenantId: string, from: Date, to: Date): Promise<FinancialSummary> {
    const db = this.prisma.forTenant(tenantId);
    const range = { gte: from, lt: to };

    const [abonos, prestamos, byMethodRaw, disbursedAgg, allocations, expensesAgg, basesRaw] = await Promise.all([
      db.payment.count({ where: { status: 'COMPLETED', paidAt: range } }),
      db.loan.count({ where: { createdAt: range, deletedAt: null } }),
      db.payment.groupBy({
        by: ['method'],
        where: { status: 'COMPLETED', paidAt: range },
        _sum: { amount: true },
      }),
      db.loan.aggregate({
        where: { createdAt: range, deletedAt: null },
        _sum: { principal: true, interestTotal: true, totalDue: true },
      }),
      db.paymentAllocation.findMany({
        where: { payment: { is: { status: 'COMPLETED', paidAt: range } } },
        include: { installment: { select: { principalPart: true, interestPart: true, chargePart: true, lateFee: true } } },
      }),
      db.expense.aggregate({ where: { createdAt: range }, _sum: { amount: true } }),
      db.baseMovement.groupBy({ by: ['type'], where: { createdAt: range }, _sum: { amount: true } }),
    ]);

    // Prorratea cada allocation entre capital/interés/mora según la composición de su cuota.
    let collectedCapital = 0;
    let collectedInterest = 0;
    let collectedCharges = 0;
    let collectedLateFee = 0;
    let totalCollected = 0;
    for (const a of allocations) {
      const amt = Number(a.amount);
      totalCollected += amt;
      const p = Number(a.installment.principalPart);
      const i = Number(a.installment.interestPart);
      const ch = Number(a.installment.chargePart);
      const l = Number(a.installment.lateFee);
      const tot = p + i + ch + l;
      if (tot <= 0) {
        collectedCapital += amt; // sin composición conocida → todo a capital
        continue;
      }
      collectedCapital += (amt * p) / tot;
      collectedInterest += (amt * i) / tot;
      collectedCharges += (amt * ch) / tot;
      collectedLateFee += (amt * l) / tot;
    }

    const byMethod = byMethodRaw.map((m) => ({
      method: m.method,
      amount: round2(Number(m._sum.amount ?? 0)),
    }));
    // Total cobrado real por pagos (por si hay pagos sin allocation aún).
    const paymentsTotal = byMethod.reduce((s, m) => s + m.amount, 0);
    const expensesTotal = Number(expensesAgg._sum.amount ?? 0);
    const basesReceived = Number(basesRaw.find((b) => b.type === 'RECEIVED')?._sum.amount ?? 0);
    const basesDelivered = Number(basesRaw.find((b) => b.type === 'DELIVERED')?._sum.amount ?? 0);

    return {
      abonos,
      prestamos,
      totalCollected: round2(Math.max(totalCollected, paymentsTotal)),
      collectedCapital: round2(collectedCapital),
      collectedInterest: round2(collectedInterest),
      collectedCharges: round2(collectedCharges),
      collectedLateFee: round2(collectedLateFee),
      byMethod,
      disbursedPrincipal: round2(Number(disbursedAgg._sum.principal ?? 0)),
      disbursedInterest: round2(Number(disbursedAgg._sum.interestTotal ?? 0)),
      disbursedTotal: round2(Number(disbursedAgg._sum.totalDue ?? 0)),
      expensesTotal: round2(expensesTotal),
      netProfit: round2(collectedInterest + collectedLateFee - expensesTotal),
      basesReceived: round2(basesReceived),
      basesDelivered: round2(basesDelivered),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
