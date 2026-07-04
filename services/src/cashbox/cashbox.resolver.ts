import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { CashBoxService } from './cashbox.service';
import { CashBoxModel } from './cashbox.models';
import { AddCashMovementInput, CloseCashBoxInput, OpenCashBoxInput } from './cashbox.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => CashBoxModel)
export class CashBoxResolver {
  constructor(private readonly cashbox: CashBoxService) {}

  @Query(() => CashBoxModel, { name: 'myOpenCashBox', nullable: true })
  myOpen(@CurrentUser() user: AuthContext): Promise<CashBoxModel | null> {
    return this.cashbox.myOpenCashBox(user.tenantId, user.userId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => CashBoxModel)
  openCashBox(
    @CurrentUser() user: AuthContext,
    @Args('input') input: OpenCashBoxInput,
  ): Promise<CashBoxModel> {
    return this.cashbox.open(user.tenantId, user.userId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => CashBoxModel)
  addCashMovement(
    @CurrentUser() user: AuthContext,
    @Args('input') input: AddCashMovementInput,
  ): Promise<CashBoxModel> {
    return this.cashbox.addMovement(user.tenantId, user.userId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => CashBoxModel)
  closeCashBox(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CloseCashBoxInput,
  ): Promise<CashBoxModel> {
    return this.cashbox.close(user.tenantId, user.userId, input);
  }
}
