import { Injectable, Logger } from '@nestjs/common';
import { calcLateFee, daysOverdue, type CreditTerms } from '@cobradiario/credit-engine';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface SweepResult {
  loansScanned: number;
  installmentsOverdue: number;
  newlyOverdue: number;
  lateFeesApplied: number;
}

export interface ReminderResult {
  loansScanned: number;
  remindersSent: number;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Barrido de mora: por cada cuota vencida (pasada la gracia) marca OVERDUE y (re)calcula la
   * mora con el motor. Notifica a los créditos que caen en mora por primera vez.
   * Idempotente: reejecutarlo recalcula la mora sin duplicar transiciones/avisos.
   */
  async runOverdueSweep(tenantId?: string): Promise<SweepResult> {
    const now = new Date();
    // Barrido cross-tenant (o de un tenant): corre en contexto de sistema (bypass RLS).
    const db = this.prisma.system();
    const loans = await db.loan.findMany({
      where: { status: 'ACTIVE', deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      include: {
        installments: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
      },
    });

    const result: SweepResult = {
      loansScanned: loans.length,
      installmentsOverdue: 0,
      newlyOverdue: 0,
      lateFeesApplied: 0,
    };

    for (const loan of loans) {
      const terms = loan.terms as unknown as CreditTerms;
      const grace = terms.graceDays ?? 0;
      let loanNewlyOverdue = 0;

      for (const inst of loan.installments) {
        const overdueDays = daysOverdue(inst.dueDate, now) - grace;
        if (overdueDays <= 0) continue;

        const balance = Number(inst.amount) - Number(inst.paidAmount);
        const fee = calcLateFee(
          terms,
          { amount: Number(inst.amount), balance, dueDate: inst.dueDate },
          now,
        );

        const wasOverdue = inst.status === 'OVERDUE';
        await db.installment.update({
          where: { id: inst.id },
          data: { status: 'OVERDUE', lateFee: fee },
        });

        result.installmentsOverdue += 1;
        result.lateFeesApplied += fee;
        if (!wasOverdue) {
          result.newlyOverdue += 1;
          loanNewlyOverdue += 1;
        }
      }

      if (loanNewlyOverdue > 0) {
        await this.notifications.create({
          tenantId: loan.tenantId,
          userId: null, // broadcast al tenant (dueño/supervisores)
          type: 'LOAN_OVERDUE',
          title: 'Crédito en mora',
          body: `El crédito ${loan.code ?? loan.id.slice(-6)} tiene ${loanNewlyOverdue} cuota(s) vencida(s).`,
          data: { loanId: loan.id, newlyOverdue: loanNewlyOverdue },
          push: true,
        });
      }
    }

    this.logger.log(
      `Barrido de mora: ${result.loansScanned} créditos, ${result.installmentsOverdue} cuotas en mora (${result.newlyOverdue} nuevas).`,
    );
    return result;
  }

  /**
   * Recordatorios: notifica cuotas próximas a vencer (por defecto en ≤1 día).
   * Registra un Reminder por cuota/día para no duplicar el aviso en reejecuciones.
   */
  async runDueReminders(tenantId?: string, withinDays = 1): Promise<ReminderResult> {
    const now = new Date();
    const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const db = this.prisma.system();
    const loans = await db.loan.findMany({
      where: { status: 'ACTIVE', deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      include: {
        installments: {
          where: { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { gte: now, lte: until } },
        },
      },
    });

    let remindersSent = 0;
    for (const loan of loans) {
      if (loan.installments.length === 0) continue;
      const next = loan.installments[0];

      // Dedup: un recordatorio por cuota (targetId = installmentId).
      const already = await db.reminder.findFirst({
        where: { tenantId: loan.tenantId, targetId: next.id, type: 'PAYMENT_DUE' },
      });
      if (already) continue;

      await db.reminder.create({
        data: {
          tenantId: loan.tenantId,
          type: 'PAYMENT_DUE',
          status: 'SENT',
          targetId: next.id,
          runAt: next.dueDate,
          sentAt: now,
          payload: { loanId: loan.id, amount: Number(next.amount) },
        },
      });

      await this.notifications.create({
        tenantId: loan.tenantId,
        userId: null,
        type: 'PAYMENT_DUE',
        title: 'Cuota próxima a vencer',
        body: `El crédito ${loan.code ?? loan.id.slice(-6)} tiene una cuota por cobrar.`,
        data: { loanId: loan.id, installmentId: next.id },
        push: true,
      });
      remindersSent += 1;
    }

    this.logger.log(`Recordatorios: ${remindersSent} enviados de ${loans.length} créditos.`);
    return { loansScanned: loans.length, remindersSent };
  }
}
