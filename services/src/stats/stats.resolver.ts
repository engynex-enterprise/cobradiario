import { Query, Resolver } from '@nestjs/graphql';
import { StatsService } from './stats.service';
import { Balances, DashboardStats } from './stats.models';
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
}
