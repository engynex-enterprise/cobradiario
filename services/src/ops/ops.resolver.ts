import { Args, Query, Resolver } from '@nestjs/graphql';
import { CashMovementType } from '@prisma/client';
import { OpsService } from './ops.service';
import {
  CashMovementFeedItem,
  DueFilter,
  DueInstallment,
  PaymentFeedItem,
  ReminderItem,
} from './ops.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver()
export class OpsResolver {
  constructor(private readonly ops: OpsService) {}

  @Query(() => [PaymentFeedItem], { name: 'recentPayments' })
  recentPayments(@CurrentUser() user: AuthContext): Promise<PaymentFeedItem[]> {
    return this.ops.recentPayments(user.tenantId);
  }

  @Query(() => [DueInstallment], { name: 'dueInstallments' })
  dueInstallments(
    @CurrentUser() user: AuthContext,
    @Args('filter', { type: () => DueFilter }) filter: DueFilter,
  ): Promise<DueInstallment[]> {
    return this.ops.dueInstallments(user.tenantId, filter);
  }

  @Query(() => [CashMovementFeedItem], { name: 'cashMovements' })
  cashMovements(
    @CurrentUser() user: AuthContext,
    @Args('type', { type: () => CashMovementType, nullable: true }) type?: CashMovementType,
  ): Promise<CashMovementFeedItem[]> {
    return this.ops.cashMovements(user.tenantId, type);
  }

  @Query(() => [ReminderItem], { name: 'reminders' })
  reminders(@CurrentUser() user: AuthContext): Promise<ReminderItem[]> {
    return this.ops.reminders(user.tenantId);
  }
}
