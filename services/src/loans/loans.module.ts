import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansResolver } from './loans.resolver';

@Module({
  providers: [LoansService, LoansResolver],
  exports: [LoansService],
})
export class LoansModule {}
