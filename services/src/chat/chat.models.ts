import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

@ObjectType()
export class Message {
  @Field(() => ID) id!: string;
  @Field(() => ID) userId!: string;
  @Field() authorName!: string;
  @Field() body!: string;
  @Field() createdAt!: Date;
}

@InputType()
export class SendMessageInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

@InputType()
export class MessagesQueryInput {
  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => ID, { nullable: true }) // paginación por cursor (id)
  @IsOptional()
  @IsString()
  before?: string;
}
