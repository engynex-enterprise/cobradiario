import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import { Frequency, InterestMethod, LateFeeType, RateBasis } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Los enums ya se registran en products (products.models/inputs); aquí solo se referencian.

@InputType()
export class LoanChargeInput {
  @Field()
  @IsString()
  @MaxLength(60)
  concept!: string;

  @Field(() => Float)
  @IsPositive()
  amount!: number;
}

@InputType()
export class UpdateInstallmentInput {
  @Field(() => ID)
  @IsString()
  id!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsPositive()
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  dueDate?: Date;
}

@InputType()
export class GuarantorInput {
  @Field()
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  documentId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

@InputType()
export class CreateLoanInput {
  @Field(() => ID)
  @IsString()
  clientId!: string;

  /** Opcional: si se pasa, se usa como plantilla; si no, se usan los términos inline. */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  productId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  routeId?: string;

  @Field(() => Float)
  @IsPositive()
  principal!: number;

  // --- Términos definidos al momento del préstamo ---

  /** Número de cuotas. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  termCount?: number;

  /** Tasa de interés como fracción (0.2 = 20%). Interpretación según rateBasis. */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  interestRate?: number;

  @Field(() => InterestMethod, { nullable: true })
  @IsOptional()
  @IsEnum(InterestMethod)
  interestMethod?: InterestMethod;

  @Field(() => RateBasis, { nullable: true })
  @IsOptional()
  @IsEnum(RateBasis)
  rateBasis?: RateBasis;

  @Field(() => Frequency, { nullable: true })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  // --- Castigo / mora ---

  @Field(() => LateFeeType, { nullable: true })
  @IsOptional()
  @IsEnum(LateFeeType)
  lateFeeType?: LateFeeType;

  /** Valor de la mora: monto fijo o fracción (0.02 = 2%) según lateFeeType. */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  lateFeeValue?: number;

  /** Cargos adicionales (seguro, papelería…) que se suman al total del crédito. */
  @Field(() => [LoanChargeInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanChargeInput)
  charges?: LoanChargeInput[];

  /** Días de la semana sin cobro (0=dom … 6=sáb). Las cuotas saltan esos días. */
  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsArray()
  nonPayDays?: number[];

  /** Datos del fiador/garante (opcional). */
  @Field(() => GuarantorInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuarantorInput)
  guarantor?: GuarantorInput;

  /** Fecha de la primera cuota. Si se omite, se usa el día de hoy. */
  @Field({ nullable: true })
  @IsOptional()
  firstDueDate?: Date;
}
