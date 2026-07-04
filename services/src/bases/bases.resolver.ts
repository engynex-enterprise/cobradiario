import { Args, GraphQLISODateTime, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BasesService } from './bases.service';
import { BaseMovementModel, CreateBaseMovementInput } from './bases.models';
import { CurrentUser } from '../common/decorators';
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

  @Mutation(() => BaseMovementModel, { name: 'createBaseMovement' })
  create(@CurrentUser() user: AuthContext, @Args('input') input: CreateBaseMovementInput): Promise<BaseMovementModel> {
    return this.bases.create(user, input);
  }
}
