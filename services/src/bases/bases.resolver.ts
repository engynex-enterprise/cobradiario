import { Args, GraphQLISODateTime, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { BasesService } from './bases.service';
import { BaseMovementModel, CreateBaseMovementInput } from './bases.models';
import { CurrentUser, Roles, RequirePermissions } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => BaseMovementModel)
export class BasesResolver {
  constructor(private readonly bases: BasesService) {}

  @Query(() => [BaseMovementModel], { name: 'baseMovements' })
  list(
    @CurrentUser() user: AuthContext,
    @Args('from', { type: () => GraphQLISODateTime, nullable: true }) from?: Date,
    @Args('to', { type: () => GraphQLISODateTime, nullable: true }) to?: Date,
  ): Promise<BaseMovementModel[]> {
    return this.bases.list(user.tenantId, from, to);
  }

  @RequirePermissions('register_payments')
  @Mutation(() => BaseMovementModel, { name: 'createBaseMovement' })
  create(@CurrentUser() user: AuthContext, @Args('input') input: CreateBaseMovementInput): Promise<BaseMovementModel> {
    return this.bases.create(user, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @RequirePermissions('view_finance')
  @Mutation(() => ID, { name: 'deleteBaseMovement' })
  remove(@CurrentUser() user: AuthContext, @Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.bases.remove(user.tenantId, id);
  }
}
