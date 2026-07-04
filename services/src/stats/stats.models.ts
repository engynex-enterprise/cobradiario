import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StatusCount {
  @Field() status!: string;
  @Field(() => Int) count!: number;
  @Field(() => Float) balance!: number;
}

@ObjectType()
export class DailyCollection {
  @Field() date!: string; // YYYY-MM-DD
  @Field(() => Float) amount!: number;
}

@ObjectType()
export class CollectorBalance {
  @Field() collectorId!: string;
  @Field({ nullable: true }) collectorName?: string;
  @Field(() => Float) collected!: number;
  @Field(() => Int) payments!: number;
}

@ObjectType()
export class Balances {
  @Field(() => Float) totalPrincipal!: number; // capital colocado
  @Field(() => Float) totalDue!: number; // total a cobrar
  @Field(() => Float) totalPaid!: number; // recaudado histórico
  @Field(() => Float) outstanding!: number; // saldo por cobrar
  @Field(() => [CollectorBalance]) byCollector!: CollectorBalance[];
}

@ObjectType()
export class DashboardStats {
  @Field(() => Float) totalPortfolio!: number; // saldo pendiente de créditos activos
  @Field(() => Float) collectedToday!: number;
  @Field(() => Int) activeLoans!: number;
  @Field(() => Int) overdueInstallments!: number;
  @Field(() => [StatusCount]) portfolioByStatus!: StatusCount[];
  @Field(() => [DailyCollection]) collectionLast7Days!: DailyCollection[];
}
