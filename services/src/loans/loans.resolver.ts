import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { LoansService } from './loans.service';
import { LoanModel } from './loans.models';
import { CreateLoanInput } from './loans.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => LoanModel)
export class LoansResolver {
  constructor(private readonly loans: LoansService) {}

  @Query(() => [LoanModel], { name: 'loans' })
  list(
    @CurrentUser() user: AuthContext,
    @Args('routeId', { type: () => ID, nullable: true }) routeId?: string,
  ): Promise<LoanModel[]> {
    return this.loans.list(user.tenantId, routeId);
  }

  @Query(() => LoanModel, { name: 'loan' })
  byId(
    @CurrentUser() user: AuthContext,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<LoanModel> {
    return this.loans.findById(user.tenantId, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => LoanModel)
  createLoan(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CreateLoanInput,
  ): Promise<LoanModel> {
    return this.loans.createLoan(user.tenantId, input);
  }
}
