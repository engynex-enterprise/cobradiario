import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Balances, DashboardStats } from './stats.models';

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
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
