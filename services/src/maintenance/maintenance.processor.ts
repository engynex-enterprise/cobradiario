import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_MAINTENANCE, type MaintenanceJob } from '../queue/queue.constants';
import { MaintenanceService } from './maintenance.service';

/** Worker de mantenimiento: ejecuta barridos de mora y recordatorios encolados. */
@Processor(QUEUE_MAINTENANCE)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(private readonly service: MaintenanceService) {
    super();
  }

  async process(job: Job<MaintenanceJob>): Promise<unknown> {
    const data = job.data;
    switch (data.type) {
      case 'overdue-sweep':
        return this.service.runOverdueSweep(data.tenantId);
      case 'due-reminders':
        return this.service.runDueReminders(data.tenantId, data.withinDays ?? 1);
      default:
        this.logger.warn(`Job de mantenimiento desconocido: ${JSON.stringify(data)}`);
        return null;
    }
  }
}
