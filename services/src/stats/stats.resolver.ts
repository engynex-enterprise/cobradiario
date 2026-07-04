import { Query, Resolver } from '@nestjs/graphql';
import { StatsService } from './stats.service';
import { DashboardStats } from './stats.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => DashboardStats)
export class StatsResolver {
  constructor(private readonly stats: StatsService) {}

  @Query(() => DashboardStats, { name: 'dashboardStats' })
  dashboard(@CurrentUser() user: AuthContext): Promise<DashboardStats> {
    return this.stats.dashboard(user.tenantId);
  }
}
