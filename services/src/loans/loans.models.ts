import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { InstallmentStatus, LoanStatus } from '@prisma/client';

registerEnumType(LoanStatus, { name: 'LoanStatus' });
registerEnumType(InstallmentStatus, { name: 'InstallmentStatus' });

@ObjectType('Installment')
export class InstallmentModel {
  @Field(() => ID) id!: string;
  @Field(() => Int) sequence!: number;
  @Field(() => InstallmentStatus) status!: InstallmentStatus;
  @Field() dueDate!: Date;
  @Field(() => Float) amount!: number;
  @Field(() => Float) principalPart!: number;
  @Field(() => Float) interestPart!: number;
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
  @Field(() => ID) productId!: string;
  @Field(() => ID, { nullable: true }) routeId?: string;
  @Field({ nullable: true }) routeName?: string;
  @Field(() => Float) principal!: number;
  @Field(() => Float) interestTotal!: number;
  @Field(() => Float) totalDue!: number;
  @Field(() => Float) paidAmount!: number;
  @Field(() => Float) balance!: number;
  @Field({ nullable: true }) disbursedAt?: Date;
  @Field({ nullable: true }) firstDueDate?: Date;
  @Field() createdAt!: Date;
  @Field(() => [InstallmentModel], { nullable: true })
  installments?: InstallmentModel[];
}
