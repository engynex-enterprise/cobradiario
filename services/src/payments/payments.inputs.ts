import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

@InputType()
export class RegisterPaymentInput {
  @Field(() => ID)
  @IsString()
  loanId!: string;

  @Field(() => Float)
  @IsPositive()
  amount!: number;

  @Field(() => PaymentMethod, { defaultValue: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  /** Clave de idempotencia para reintentos offline de la app (evita doble cobro). */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
