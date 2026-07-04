import { Field, Float, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
  Frequency,
  InterestMethod,
  LateFeeType,
  RateBasis,
  RoundingMode,
} from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// InterestMethod y Frequency ya se registran en products.models; aquí los restantes.
registerEnumType(RateBasis, { name: 'RateBasis' });
registerEnumType(LateFeeType, { name: 'LateFeeType' });
registerEnumType(RoundingMode, { name: 'RoundingMode' });

@InputType()
export class CreateProductInput {
  @Field()
  @IsString()
  name!: string;

  @Field(() => InterestMethod, { defaultValue: InterestMethod.FLAT })
  @IsEnum(InterestMethod)
  interestMethod!: InterestMethod;

  @Field(() => Float, { defaultValue: 0.2 })
  @IsNumber()
  interestRate!: number;

  @Field(() => RateBasis, { defaultValue: RateBasis.PER_LOAN })
  @IsEnum(RateBasis)
  rateBasis!: RateBasis;

  @Field(() => Frequency, { defaultValue: Frequency.DAILY })
  @IsEnum(Frequency)
  frequency!: Frequency;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  termCount!: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  graceDays!: number;

  @Field(() => LateFeeType, { defaultValue: LateFeeType.NONE })
  @IsEnum(LateFeeType)
  lateFeeType!: LateFeeType;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  lateFeeValue!: number;

  @Field(() => RoundingMode, { defaultValue: RoundingMode.NEAREST })
  @IsEnum(RoundingMode)
  roundingMode!: RoundingMode;

  @Field(() => Float, { defaultValue: 1 })
  @IsNumber()
  roundTo!: number;
}
