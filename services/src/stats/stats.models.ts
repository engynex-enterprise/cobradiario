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
export class DashboardStats {
  @Field(() => Float) totalPortfolio!: number; // saldo pendiente de créditos activos
  @Field(() => Float) collectedToday!: number;
  @Field(() => Int) activeLoans!: number;
  @Field(() => Int) overdueInstallments!: number;
  @Field(() => [StatusCount]) portfolioByStatus!: StatusCount[];
  @Field(() => [DailyCollection]) collectionLast7Days!: DailyCollection[];
}
