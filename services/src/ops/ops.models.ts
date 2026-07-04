import { Field, Float, GraphQLISODateTime, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { CashMovementType, PaymentMethod } from '@prisma/client';

export enum DueFilter {
  TODAY = 'TODAY',
  OVERDUE = 'OVERDUE',
  UPCOMING = 'UPCOMING',
}
registerEnumType(DueFilter, { name: 'DueFilter' });

@ObjectType('PaymentFeedItem')
export class PaymentFeedItem {
  @Field(() => ID) id!: string;
  @Field(() => ID) loanId!: string;
  @Field({ nullable: true }) clientName?: string;
  @Field(() => Float) amount!: number;
  @Field(() => PaymentMethod) method!: PaymentMethod;
  @Field({ nullable: true }) collectorName?: string;
  @Field(() => GraphQLISODateTime) paidAt!: Date;
}

@ObjectType('DueInstallment')
export class DueInstallment {
  @Field(() => ID) id!: string;
  @Field(() => ID) loanId!: string;
  @Field({ nullable: true }) clientName?: string;
  @Field({ nullable: true }) routeName?: string;
  @Field(() => Int) sequence!: number;
  @Field() status!: string;
  @Field(() => GraphQLISODateTime) dueDate!: Date;
  @Field(() => Float) amount!: number;
  @Field(() => Float) lateFee!: number;
  @Field(() => Float) paidAmount!: number;
}

@ObjectType('CashMovementFeedItem')
export class CashMovementFeedItem {
  @Field(() => ID) id!: string;
  @Field(() => CashMovementType) type!: CashMovementType;
  @Field(() => Float) amount!: number;
  @Field({ nullable: true }) note?: string;
  @Field({ nullable: true }) collectorName?: string;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType('ReminderItem')
export class ReminderItem {
  @Field(() => ID) id!: string;
  @Field() type!: string;
  @Field() status!: string;
  @Field(() => GraphQLISODateTime) runAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) sentAt?: Date;
}
