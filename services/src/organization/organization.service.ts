import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrganizationModel, OrgMemberModel, OrgInvitationModel } from './organization.models';
import { InviteMemberInput, UpdateMemberRoleInput, UpdateOrganizationInput } from './organization.inputs';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async organization(tenantId: string): Promise<OrganizationModel> {
    const db = this.prisma.forTenant(tenantId);
    const tenant = await db.tenant.findFirstOrThrow({ where: { id: tenantId } });
    const memberCount = await db.membership.count({ where: { status: 'ACTIVE' } });
    return { id: tenant.id, name: tenant.name, type: tenant.type, memberCount, createdAt: tenant.createdAt };
  }

  async updateOrganization(tenantId: string, input: UpdateOrganizationInput): Promise<OrganizationModel> {
    await this.prisma.forTenant(tenantId).tenant.update({ where: { id: tenantId }, data: { name: input.name.trim() } });
    return this.organization(tenantId);
  }

  async members(tenantId: string): Promise<OrgMemberModel[]> {
    const users = await this.prisma.forTenant(tenantId).user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.memberships[0]?.role ?? UserRole.VIEWER,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }

  async updateMemberRole(tenantId: string, currentUserId: string, input: UpdateMemberRoleInput): Promise<OrgMemberModel[]> {
    if (input.userId === currentUserId) throw new BadRequestException('No puedes cambiar tu propio rol.');
    const db = this.prisma.forTenant(tenantId);
    const membership = await db.membership.findFirst({ where: { userId: input.userId, status: 'ACTIVE' } });
    if (!membership) throw new BadRequestException('El miembro no existe en esta organización.');
    await db.membership.update({ where: { id: membership.id }, data: { role: input.role } });
    return this.members(tenantId);
  }

  async removeMember(tenantId: string, currentUserId: string, userId: string): Promise<OrgMemberModel[]> {
    if (userId === currentUserId) throw new BadRequestException('No puedes eliminarte a ti mismo.');
    const db = this.prisma.forTenant(tenantId);
    await db.membership.updateMany({ where: { userId }, data: { status: 'DISABLED' } });
    await db.user.update({ where: { id: userId }, data: { isActive: false, deletedAt: new Date() } });
    return this.members(tenantId);
  }

  // ---- invitaciones ----
  async pendingInvitations(tenantId: string): Promise<OrgInvitationModel[]> {
    const rows = await this.prisma.forTenant(tenantId).invitation.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      invitedByName: i.invitedByName ?? undefined,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
  }

  async inviteMember(tenantId: string, currentUserId: string, input: InviteMemberInput): Promise<OrgInvitationModel> {
    const email = input.email.toLowerCase().trim();
    const db = this.prisma.forTenant(tenantId);
    const inviter = await db.user.findFirst({ where: { id: currentUserId }, select: { fullName: true } });
    const inviterName = inviter?.fullName ?? 'Un administrador';

    const existing = await db.user.findFirst({ where: { email, deletedAt: null } });
    if (existing) throw new ConflictException('Ya existe un miembro con ese correo en la organización.');

    // Anula invitaciones PENDING previas para el mismo correo.
    await db.invitation.updateMany({ where: { email, status: 'PENDING' }, data: { status: 'CANCELLED' } });

    const rawToken = randomBytes(32).toString('hex');
    const invitation = await db.invitation.create({
      data: {
        tenantId,
        email,
        role: input.role,
        tokenHash: hashToken(rawToken),
        invitedByName: inviterName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const org = await db.tenant.findFirstOrThrow({ where: { id: tenantId } });
    const base = process.env.WEB_APP_URL ?? 'http://localhost:3000';
    const link = `${base}/invitacion?token=${rawToken}`;
    await this.mail.sendOrgInvite(email, org.name, inviterName, roleLabel(input.role), link);

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedByName: invitation.invitedByName ?? undefined,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async cancelInvitation(tenantId: string, id: string): Promise<boolean> {
    await this.prisma.forTenant(tenantId).invitation.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    return true;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function roleLabel(role: UserRole): string {
  return ({ OWNER: 'Dueño', ADMIN: 'Administrador', MANAGER: 'Supervisor', COLLECTOR: 'Cobrador', VIEWER: 'Consulta' } as Record<string, string>)[role] ?? role;
}
