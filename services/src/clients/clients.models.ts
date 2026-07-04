import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Client')
export class ClientModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field({ nullable: true }) documentId?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) address?: string;
  @Field({ nullable: true }) city?: string;
  @Field() createdAt!: Date;
}
