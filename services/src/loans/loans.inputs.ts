import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import { Frequency, InterestMethod, LateFeeType, RateBasis } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

// Los enums ya se registran en products (products.models/inputs); aquí solo se referencian.

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

  /** Fecha de la primera cuota. Si se omite, se usa el día de hoy. */
  @Field({ nullable: true })
  @IsOptional()
  firstDueDate?: Date;
}
