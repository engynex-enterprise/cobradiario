import { Injectable } from '@nestjs/common';
import { CashMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CashMovementFeedItem,
  DueFilter,
  DueInstallment,
  PaymentFeedItem,
  ReminderItem,
} from './ops.models';

@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  async recentPayments(tenantId: string): Promise<PaymentFeedItem[]> {
    const rows = await this.prisma.forTenant(tenantId).payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { loan: { include: { client: true } }, collector: true },
    });
    return rows.map((p) => ({
      id: p.id,
      loanId: p.loanId,
      clientName: p.loan?.client?.fullName,
      amount: Number(p.amount),
      method: p.method,
      collectorName: p.collector?.fullName ?? undefined,
      paidAt: p.paidAt,
    }));
  }

  async dueInstallments(tenantId: string, filter: DueFilter): Promise<DueInstallment[]> {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setUTCHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setUTCDate(endToday.getUTCDate() + 1);
    const in7 = new Date(startToday);
    in7.setUTCDate(in7.getUTCDate() + 7);

    let where: Prisma.InstallmentWhereInput;
    if (filter === DueFilter.OVERDUE) {
      where = { status: 'OVERDUE' };
    } else if (filter === DueFilter.UPCOMING) {
      where = { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { gt: endToday, lte: in7 } };
    } else {
      // Incluye PAID para que las cuotas ya cobradas hoy sigan visibles y la
      // meta/indicadores del día reflejen el avance (no desaparezcan al pagarse).
      where = { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'PAID'] }, dueDate: { gte: startToday, lt: endToday } };
    }

    const rows = await this.prisma.forTenant(tenantId).installment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: 200,
      include: { loan: { include: { client: true, route: true } } },
    });
    return rows.map((it) => ({
      id: it.id,
      loanId: it.loanId,
      clientName: it.loan?.client?.fullName,
      routeName: it.loan?.route?.name ?? undefined,
      sequence: it.sequence,
      status: it.status,
      dueDate: it.dueDate,
      amount: Number(it.amount),
      lateFee: Number(it.lateFee),
      paidAmount: Number(it.paidAmount),
    }));
  }

  async cashMovements(tenantId: string, type?: CashMovementType): Promise<CashMovementFeedItem[]> {
    const rows = await this.prisma.forTenant(tenantId).cashMovement.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { cashBox: { include: { user: true } } },
    });
    return rows.map((m) => ({
      id: m.id,
      type: m.type,
      amount: Number(m.amount),
      note: m.note ?? undefined,
      collectorName: m.cashBox?.user?.fullName ?? undefined,
      createdAt: m.createdAt,
    }));
  }

  async reminders(tenantId: string): Promise<ReminderItem[]> {
    const rows = await this.prisma.forTenant(tenantId).reminder.findMany({
      orderBy: { runAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      runAt: r.runAt,
      sentAt: r.sentAt ?? undefined,
    }));
  }
}
