import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Client')
export class ClientModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field({ nullable: true }) documentId?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) address?: string;
  @Field({ nullable: true }) city?: string;
  @Field() createdAt!: Date;
  @Field(() => Int, { defaultValue: 0 }) loansCount!: number;
  @Field(() => Int, { defaultValue: 0 }) activeLoans!: number;
  @Field(() => Float, { defaultValue: 0 }) totalBalance!: number;
}
