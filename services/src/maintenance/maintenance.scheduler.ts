import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_MAINTENANCE, type MaintenanceJob } from '../queue/queue.constants';

/**
 * Registra los jobs repetibles (cron) al arrancar. BullMQ deduplica por jobId de repetición,
 * así que reiniciar la app no crea duplicados.
 *
 * Zona horaria: se ejecuta en la del proceso; en multi-tenant con distintas TZ conviene, a
 * futuro, particionar por tenant y respetar su `timezone`. Ver context/01-architecture.md §5.
 */
@Injectable()
export class MaintenanceScheduler implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(
    @InjectQueue(QUEUE_MAINTENANCE) private readonly queue: Queue<MaintenanceJob>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Barrido de mora: todos los días a las 02:00.
    await this.queue.add(
      'overdue-sweep',
      { type: 'overdue-sweep' },
      { repeat: { pattern: '0 2 * * *' }, jobId: 'cron-overdue-sweep', removeOnComplete: 50 },
    );

    // Recordatorios de cuotas próximas: todos los días a las 07:00.
    await this.queue.add(
      'due-reminders',
      { type: 'due-reminders', withinDays: 1 },
      { repeat: { pattern: '0 7 * * *' }, jobId: 'cron-due-reminders', removeOnComplete: 50 },
    );

    this.logger.log('Jobs repetibles de mantenimiento registrados (mora 02:00, recordatorios 07:00).');
  }
}
