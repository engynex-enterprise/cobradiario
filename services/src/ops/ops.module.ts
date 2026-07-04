import { Module } from '@nestjs/common';
import { OpsService } from './ops.service';
import { OpsResolver } from './ops.resolver';

@Module({
  providers: [OpsService, OpsResolver],
})
export class OpsModule {}
