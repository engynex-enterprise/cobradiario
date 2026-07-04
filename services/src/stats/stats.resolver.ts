import { Args, Query, Resolver } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { StatsService } from './stats.service';
import { Balances, DashboardStats, FinancialSummary } from './stats.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver()
export class StatsResolver {
  constructor(private readonly stats: StatsService) {}

  @Query(() => DashboardStats, { name: 'dashboardStats' })
  dashboard(@CurrentUser() user: AuthContext): Promise<DashboardStats> {
    return this.stats.dashboard(user.tenantId);
  }

  @Query(() => Balances, { name: 'balances' })
  balances(@CurrentUser() user: AuthContext): Promise<Balances> {
    return this.stats.balances(user.tenantId);
  }

  @Query(() => FinancialSummary, { name: 'financialSummary' })
  financialSummary(
    @CurrentUser() user: AuthContext,
    @Args('from', { type: () => GraphQLISODateTime, nullable: true }) from?: Date,
    @Args('to', { type: () => GraphQLISODateTime, nullable: true }) to?: Date,
  ): Promise<FinancialSummary> {
    // Por defecto: hoy (00:00 UTC) hasta mañana.
    const start = from ?? startOfTodayUtc();
    const end = to ?? addDays(start, 1);
    return this.stats.financialSummary(user.tenantId, start, end);
  }
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
