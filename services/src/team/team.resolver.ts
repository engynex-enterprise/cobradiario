import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { TeamService } from './team.service';
import { TeamMemberModel } from './team.models';
import { CreateTeamMemberInput } from './team.inputs';
import { CurrentUser, Roles, RequirePermissions } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => TeamMemberModel)
export class TeamResolver {
  constructor(private readonly team: TeamService) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Query(() => [TeamMemberModel], { name: 'teamMembers' })
  list(@CurrentUser() user: AuthContext): Promise<TeamMemberModel[]> {
    return this.team.list(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @RequirePermissions('manage_members')
  @Mutation(() => TeamMemberModel)
  createTeamMember(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CreateTeamMemberInput,
  ): Promise<TeamMemberModel> {
    return this.team.create(user.tenantId, input);
  }
}
