import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { OrganizationService } from './organization.service';
import { OrganizationModel, OrgMemberModel, OrgInvitationModel, OrgAuditLogModel } from './organization.models';
import { InviteMemberInput, UpdateMemberRoleInput, UpdateOrganizationInput } from './organization.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver()
export class OrganizationResolver {
  constructor(private readonly org: OrganizationService) {}

  @Query(() => OrganizationModel, { name: 'organization' })
  organization(@CurrentUser() user: AuthContext): Promise<OrganizationModel> {
    return this.org.organization(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Query(() => [OrgMemberModel], { name: 'organizationMembers' })
  members(@CurrentUser() user: AuthContext): Promise<OrgMemberModel[]> {
    return this.org.members(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Query(() => [OrgInvitationModel], { name: 'pendingInvitations' })
  pendingInvitations(@CurrentUser() user: AuthContext): Promise<OrgInvitationModel[]> {
    return this.org.pendingInvitations(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Query(() => [OrgAuditLogModel], { name: 'auditLogs' })
  auditLogs(@CurrentUser() user: AuthContext): Promise<OrgAuditLogModel[]> {
    return this.org.auditLogs(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => OrganizationModel)
  updateOrganization(@CurrentUser() user: AuthContext, @Args('input') input: UpdateOrganizationInput): Promise<OrganizationModel> {
    return this.org.updateOrganization(user.tenantId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => OrgInvitationModel)
  inviteMember(@CurrentUser() user: AuthContext, @Args('input') input: InviteMemberInput): Promise<OrgInvitationModel> {
    return this.org.inviteMember(user.tenantId, user.userId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => Boolean)
  cancelInvitation(@CurrentUser() user: AuthContext, @Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.org.cancelInvitation(user.tenantId, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => [OrgMemberModel])
  updateMemberRole(@CurrentUser() user: AuthContext, @Args('input') input: UpdateMemberRoleInput): Promise<OrgMemberModel[]> {
    return this.org.updateMemberRole(user.tenantId, user.userId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => [OrgMemberModel])
  removeMember(@CurrentUser() user: AuthContext, @Args('userId', { type: () => ID }) userId: string): Promise<OrgMemberModel[]> {
    return this.org.removeMember(user.tenantId, user.userId, userId);
  }
}
