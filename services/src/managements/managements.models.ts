import { Field, Float, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ManagementType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

registerEnumType(ManagementType, { name: 'ManagementType' });

@ObjectType('CollectionManagement')
export class ManagementModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) loanId!: string;
  @Field(() => ID) userId!: string;
  @Field() authorName!: string;
  @Field(() => ManagementType) type!: ManagementType;
  @Field({ nullable: true }) result?: string;
  @Field({ nullable: true }) note?: string;
  @Field(() => Float, { nullable: true }) promiseAmount?: number;
  @Field({ nullable: true }) promiseDate?: Date;
  @Field({ nullable: true }) followUpDate?: Date;
  @Field({ nullable: true }) followUpNote?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateManagementInput {
  @Field(() => ID)
  @IsString()
  loanId!: string;

  @Field(() => ManagementType)
  @IsEnum(ManagementType)
  type!: ManagementType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  result?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  promiseAmount?: number;

  @Field({ nullable: true })
  @IsOptional()
  promiseDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  followUpDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  followUpNote?: string;
}
