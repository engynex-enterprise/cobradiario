import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceProcessor } from './maintenance.processor';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { MaintenanceResolver } from './maintenance.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUE_MAINTENANCE } from '../queue/queue.constants';

@Module({
  imports: [NotificationsModule, BullModule.registerQueue({ name: QUEUE_MAINTENANCE })],
  providers: [MaintenanceService, MaintenanceProcessor, MaintenanceScheduler, MaintenanceResolver],
})
export class MaintenanceModule {}
