import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class ClientReferenceInput {
  @Field()
  @IsString()
  @MaxLength(140)
  fullName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  relationship?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}


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
  documentType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone2?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  occupation?: string;

  @Field({ nullable: true })
  @IsOptional()
  birthDate?: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentFrontUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentBackUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  selfieWithDocUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @Field(() => [ClientReferenceInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientReferenceInput)
  references?: ClientReferenceInput[];
}

@InputType()
export class UpdateClientInput {
  @Field(() => ID)
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  fullName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone2?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  occupation?: string;

  @Field({ nullable: true })
  @IsOptional()
  birthDate?: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentFrontUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentBackUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  selfieWithDocUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @Field(() => [ClientReferenceInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientReferenceInput)
  references?: ClientReferenceInput[];
}

@InputType()
export class CreateGuarantorInput {
  @Field(() => ID)
  @IsString()
  clientId!: string;

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
  relationship?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

@InputType()
export class UpdateGuarantorInput {
  @Field(() => ID)
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  fullName?: string;

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
  relationship?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
