import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

@ObjectType('Expense')
export class ExpenseModel {
  @Field(() => ID) id!: string;
  @Field() authorName!: string;
  @Field() category!: string;
  @Field(() => Float) amount!: number;
  @Field({ nullable: true }) note?: string;
  @Field({ nullable: true }) routeId?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateExpenseInput {
  @Field()
  @IsString()
  @MaxLength(60)
  category!: string;

  @Field(() => Float)
  @IsPositive()
  amount!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  routeId?: string;
}
