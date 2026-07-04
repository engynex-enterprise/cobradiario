import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { LoanModel } from '../loans/loans.models';

registerEnumType(PaymentMethod, { name: 'PaymentMethod' });
registerEnumType(PaymentStatus, { name: 'PaymentStatus' });

@ObjectType('Payment')
export class PaymentModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) loanId!: string;
  @Field(() => Float) amount!: number;
  @Field(() => PaymentMethod) method!: PaymentMethod;
  @Field(() => PaymentStatus) status!: PaymentStatus;
  @Field({ nullable: true }) note?: string;
  @Field(() => Float, { nullable: true }) latitude?: number;
  @Field(() => Float, { nullable: true }) longitude?: number;
  @Field() paidAt!: Date;
  @Field() createdAt!: Date;
}

@ObjectType('RegisterPaymentResult')
export class RegisterPaymentResult {
  @Field(() => PaymentModel) payment!: PaymentModel;
  /** Monto efectivamente aplicado a cuotas. */
  @Field(() => Float) applied!: number;
  /** Excedente no aplicado (saldo a favor). */
  @Field(() => Float) leftover!: number;
  /** Estado del crédito tras el abono. */
  @Field(() => LoanModel) loan!: LoanModel;
}
