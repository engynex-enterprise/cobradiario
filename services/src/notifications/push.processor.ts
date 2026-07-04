import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_PUSH, type PushJob } from '../queue/queue.constants';
import { NotificationsService } from './notifications.service';

/** Worker que envía las notificaciones push encoladas. */
@Processor(QUEUE_PUSH)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<PushJob>): Promise<{ sent: number }> {
    const res = await this.notifications.sendPush(job.data);
    this.logger.debug(`Push "${job.data.title}" → ${res.sent} dispositivo(s)`);
    return res;
  }
}
