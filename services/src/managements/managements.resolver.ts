import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ManagementsService } from './managements.service';
import { CreateManagementInput, ManagementModel } from './managements.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => ManagementModel)
export class ManagementsResolver {
  constructor(private readonly managements: ManagementsService) {}

  @Query(() => [ManagementModel], { name: 'managements' })
  list(
    @CurrentUser() user: AuthContext,
    @Args('loanId', { type: () => ID }) loanId: string,
  ): Promise<ManagementModel[]> {
    return this.managements.list(user.tenantId, loanId);
  }

  @Mutation(() => ManagementModel, { name: 'createManagement' })
  create(@CurrentUser() user: AuthContext, @Args('input') input: CreateManagementInput): Promise<ManagementModel> {
    return this.managements.create(user, input);
  }
}
