import { Args, GraphQLISODateTime, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseInput, ExpenseModel } from './expenses.models';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => ExpenseModel)
export class ExpensesResolver {
  constructor(private readonly expenses: ExpensesService) {}

  @Query(() => [ExpenseModel], { name: 'expenses' })
  list(
    @CurrentUser() user: AuthContext,
    @Args('from', { type: () => GraphQLISODateTime, nullable: true }) from?: Date,
    @Args('to', { type: () => GraphQLISODateTime, nullable: true }) to?: Date,
  ): Promise<ExpenseModel[]> {
    return this.expenses.list(user.tenantId, from, to);
  }

  @Mutation(() => ExpenseModel, { name: 'createExpense' })
  create(@CurrentUser() user: AuthContext, @Args('input') input: CreateExpenseInput): Promise<ExpenseModel> {
    return this.expenses.create(user, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => ID, { name: 'deleteExpense' })
  remove(@CurrentUser() user: AuthContext, @Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.expenses.remove(user.tenantId, id);
  }
}
