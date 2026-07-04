import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStats } from './stats.models';

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
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
