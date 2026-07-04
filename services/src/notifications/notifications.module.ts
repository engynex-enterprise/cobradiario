import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { PushProcessor } from './push.processor';
import { RealtimeModule } from '../realtime/realtime.module';
import { QUEUE_PUSH } from '../queue/queue.constants';

@Module({
  imports: [RealtimeModule, BullModule.registerQueue({ name: QUEUE_PUSH })],
  providers: [NotificationsService, NotificationsResolver, PushProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
