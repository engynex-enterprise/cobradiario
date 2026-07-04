import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { RoutesService } from './routes.service';
import { RouteModel } from './routes.models';
import { AssignCollectorInput, CreateRouteInput } from './routes.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => RouteModel)
export class RoutesResolver {
  constructor(private readonly routes: RoutesService) {}

  @Query(() => [RouteModel], { name: 'routes' })
  list(@CurrentUser() user: AuthContext): Promise<RouteModel[]> {
    return this.routes.list(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => RouteModel)
  createRoute(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CreateRouteInput,
  ): Promise<RouteModel> {
    return this.routes.create(user.tenantId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => RouteModel)
  assignCollector(
    @CurrentUser() user: AuthContext,
    @Args('input') input: AssignCollectorInput,
  ): Promise<RouteModel> {
    return this.routes.assignCollector(user.tenantId, input);
  }
}
