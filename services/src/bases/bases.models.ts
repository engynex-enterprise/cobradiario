import { Field, Float, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BaseType } from '@prisma/client';
import { IsEnum, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

registerEnumType(BaseType, { name: 'BaseType' });

@ObjectType('BaseMovement')
export class BaseMovementModel {
  @Field(() => ID) id!: string;
  @Field() authorName!: string;
  @Field(() => BaseType) type!: BaseType;
  @Field(() => Float) amount!: number;
  @Field({ nullable: true }) note?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateBaseMovementInput {
  @Field(() => BaseType)
  @IsEnum(BaseType)
  type!: BaseType;

  @Field(() => Float)
  @IsPositive()
  amount!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
