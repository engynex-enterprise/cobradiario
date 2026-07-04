import { Module } from '@nestjs/common';
import { BasesService } from './bases.service';
import { BasesResolver } from './bases.resolver';

@Module({
  providers: [BasesService, BasesResolver],
})
export class BasesModule {}
