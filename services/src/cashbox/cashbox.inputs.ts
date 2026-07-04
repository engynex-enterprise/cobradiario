import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { CashMovementType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

@InputType()
export class OpenCashBoxInput {
  @Field(() => Float)
  @IsNumber()
  openingBalance!: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  routeId?: string;
}

@InputType()
export class AddCashMovementInput {
  // Tipos permitidos manualmente (COLLECTION se genera desde los abonos).
  @Field(() => CashMovementType)
  @IsEnum(CashMovementType)
  type!: CashMovementType;

  @Field(() => Float)
  @IsNumber()
  amount!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class CloseCashBoxInput {
  @Field(() => Float)
  @IsPositive()
  countedBalance!: number;
}
