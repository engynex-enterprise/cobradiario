import { Field, Float, GraphQLISODateTime, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { CashMovementType } from '@prisma/client';

registerEnumType(CashMovementType, { name: 'CashMovementType' });

@ObjectType('CashMovement')
export class CashMovementModel {
  @Field(() => ID) id!: string;
  @Field(() => CashMovementType) type!: CashMovementType;
  @Field(() => Float) amount!: number;
  @Field({ nullable: true }) note?: string;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType('CashBox')
export class CashBoxModel {
  @Field(() => ID) id!: string;
  @Field() isOpen!: boolean;
  @Field(() => Float) openingBalance!: number;
  /** Ingresos por cobro acumulados en la jornada. */
  @Field(() => Float) collectionsTotal!: number;
  /** Saldo que debería haber en caja según los movimientos. */
  @Field(() => Float) expectedBalance!: number;
  /** Saldo contado al cierre (null si sigue abierta). */
  @Field(() => Float, { nullable: true }) closingBalance?: number;
  /** Diferencia contado - esperado al cierre (negativo = faltante). */
  @Field(() => Float, { nullable: true }) difference?: number;
  @Field(() => GraphQLISODateTime) openedAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) closedAt?: Date;
  @Field(() => [CashMovementModel]) movements!: CashMovementModel[];
}
