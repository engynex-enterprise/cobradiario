import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Frequency, InstallmentStatus, InterestMethod, LoanStatus } from '@prisma/client';

registerEnumType(LoanStatus, { name: 'LoanStatus' });
registerEnumType(InstallmentStatus, { name: 'InstallmentStatus' });
// Frequency e InterestMethod ya están registrados en products.models.

@ObjectType('Installment')
export class InstallmentModel {
  @Field(() => ID) id!: string;
  @Field(() => Int) sequence!: number;
  @Field(() => InstallmentStatus) status!: InstallmentStatus;
  @Field() dueDate!: Date;
  @Field(() => Float) amount!: number;
  @Field(() => Float) principalPart!: number;
  @Field(() => Float) interestPart!: number;
  @Field(() => Float) chargePart!: number;
  @Field(() => Float) lateFee!: number;
  @Field(() => Float) paidAmount!: number;
}

@ObjectType('Loan')
export class LoanModel {
  @Field(() => ID) id!: string;
  @Field({ nullable: true }) code?: string;
  @Field(() => LoanStatus) status!: LoanStatus;
  @Field(() => ID) clientId!: string;
  @Field({ nullable: true }) clientName?: string;
  @Field(() => ID, { nullable: true }) productId?: string;
  @Field(() => ID, { nullable: true }) routeId?: string;
  @Field({ nullable: true }) routeName?: string;
  @Field(() => Float) principal!: number;
  @Field(() => Float) interestTotal!: number;
  @Field(() => Float) totalDue!: number;
  @Field(() => Float) paidAmount!: number;
  @Field(() => Float) balance!: number;

  // Términos congelados del crédito (snapshot).
  @Field(() => Int, { nullable: true }) termCount?: number;
  @Field(() => Float, { nullable: true }) interestRate?: number;
  @Field(() => InterestMethod, { nullable: true }) interestMethod?: InterestMethod;
  @Field(() => Frequency, { nullable: true }) frequency?: Frequency;
  @Field(() => Float, { nullable: true }) lateFeeValue?: number;
  @Field(() => Float, { nullable: true }) chargesTotal?: number;

  @Field({ nullable: true }) disbursedAt?: Date;
  @Field({ nullable: true }) firstDueDate?: Date;
  @Field() createdAt!: Date;
  @Field(() => [InstallmentModel], { nullable: true })
  installments?: InstallmentModel[];
}
