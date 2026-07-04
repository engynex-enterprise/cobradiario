import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@ObjectType()
export class Tag {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() color!: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateTagInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

@InputType()
export class UpdateTagInput {
  @Field(() => ID)
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
