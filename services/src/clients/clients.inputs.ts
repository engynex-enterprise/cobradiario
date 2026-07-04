import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateClientInput {
  @Field()
  @IsString()
  @MaxLength(140)
  fullName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;
}
