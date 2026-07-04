import { Module } from '@nestjs/common';
import { CashBoxService } from './cashbox.service';
import { CashBoxResolver } from './cashbox.resolver';

@Module({
  providers: [CashBoxService, CashBoxResolver],
  exports: [CashBoxService],
})
export class CashBoxModule {}
