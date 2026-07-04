import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Frequency, InterestMethod } from '@prisma/client';

registerEnumType(InterestMethod, { name: 'InterestMethod' });
registerEnumType(Frequency, { name: 'Frequency' });

@ObjectType('CreditProduct')
export class ProductModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => InterestMethod) interestMethod!: InterestMethod;
  @Field(() => Float) interestRate!: number;
  @Field(() => Frequency) frequency!: Frequency;
  @Field(() => Int) termCount!: number;
}
