import { Module } from '@nestjs/common';
import { ManagementsService } from './managements.service';
import { ManagementsResolver } from './managements.resolver';

@Module({
  providers: [ManagementsService, ManagementsResolver],
})
export class ManagementsModule {}
