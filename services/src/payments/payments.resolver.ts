import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentModel, RegisterPaymentResult } from './payments.models';
import { RegisterPaymentInput } from './payments.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => PaymentModel)
export class PaymentsResolver {
  constructor(private readonly payments: PaymentsService) {}

  @Query(() => [PaymentModel], { name: 'payments' })
  list(
    @CurrentUser() user: AuthContext,
    @Args('loanId', { type: () => ID }) loanId: string,
  ): Promise<PaymentModel[]> {
    return this.payments.list(user.tenantId, loanId);
  }

  // Cobradores y roles superiores pueden registrar abonos.
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => RegisterPaymentResult)
  registerPayment(
    @CurrentUser() user: AuthContext,
    @Args('input') input: RegisterPaymentInput,
  ): Promise<RegisterPaymentResult> {
    return this.payments.registerPayment(user, input);
  }
}
