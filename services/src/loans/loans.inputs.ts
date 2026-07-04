import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsPositive, IsString } from 'class-validator';

@InputType()
export class CreateLoanInput {
  @Field(() => ID)
  @IsString()
  clientId!: string;

  @Field(() => ID)
  @IsString()
  productId!: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  routeId?: string;

  @Field(() => Float)
  @IsPositive()
  principal!: number;

  /** Fecha de la primera cuota. Si se omite, se usa el día de hoy. */
  @Field({ nullable: true })
  @IsOptional()
  firstDueDate?: Date;
}
