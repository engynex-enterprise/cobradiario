import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrganizationModel, OrgMemberModel, OrgInvitationModel, OrgAuditLogModel, OrgRoleModel } from './organization.models';
import { InviteMemberInput, UpdateMemberRoleInput, UpdateOrganizationInput } from './organization.inputs';

interface OrgSettings {
  language?: string;
  // Políticas de crédito y caja
  defaultProductId?: string;
  graceDays?: number;
  installmentRounding?: number;
  minLoanAmount?: number;
  maxLoanAmount?: number;
  moraRunHour?: number;
  reminderRunHour?: number;
  requireBaseOnCashOpen?: boolean;
  collectorCanCreateLoan?: boolean;
  collectorCanEditInstallment?: boolean;
  collectorCanDiscount?: boolean;
  collectorCanWaiveLateFee?: boolean;
  // Notificaciones
  notifyPaymentReceived?: boolean;
  notifyOverdue?: boolean;
  notifyNewLoan?: boolean;
  notifyDailySummary?: boolean;
  notifyChannelEmail?: boolean;
  notifyChannelPush?: boolean;
}

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
    const s = (tenant.settings ?? {}) as OrgSettings;
    return {
      id: tenant.id,
      name: tenant.name,
      type: tenant.type,
      legalId: tenant.legalId ?? undefined,
      countryCode: tenant.countryCode,
      currency: tenant.currency,
      language: s.language ?? 'es',
      timezone: tenant.timezone,
      memberCount,
      createdAt: tenant.createdAt,
      defaultProductId: s.defaultProductId,
      graceDays: s.graceDays ?? 0,
      installmentRounding: s.installmentRounding ?? 0,
      minLoanAmount: s.minLoanAmount,
      maxLoanAmount: s.maxLoanAmount,
      moraRunHour: s.moraRunHour ?? 2,
      reminderRunHour: s.reminderRunHour ?? 7,
      requireBaseOnCashOpen: s.requireBaseOnCashOpen ?? false,
      collectorCanCreateLoan: s.collectorCanCreateLoan ?? true,
      collectorCanEditInstallment: s.collectorCanEditInstallment ?? false,
      collectorCanDiscount: s.collectorCanDiscount ?? false,
      collectorCanWaiveLateFee: s.collectorCanWaiveLateFee ?? false,
      notifyPaymentReceived: s.notifyPaymentReceived ?? true,
      notifyOverdue: s.notifyOverdue ?? true,
      notifyNewLoan: s.notifyNewLoan ?? false,
      notifyDailySummary: s.notifyDailySummary ?? false,
      notifyChannelEmail: s.notifyChannelEmail ?? false,
      notifyChannelPush: s.notifyChannelPush ?? true,
    };
  }

  async updateOrganization(tenantId: string, input: UpdateOrganizationInput): Promise<OrganizationModel> {
    const db = this.prisma.forTenant(tenantId);
    const tenant = await db.tenant.findFirstOrThrow({ where: { id: tenantId } });
    const settings = { ...((tenant.settings ?? {}) as OrgSettings) };

    // settings JSON: idioma, políticas, permisos y notificaciones
    for (const k of ['language', 'defaultProductId'] as const) {
      if (input[k] !== undefined) settings[k] = input[k];
    }
    for (const k of ['graceDays', 'installmentRounding', 'minLoanAmount', 'maxLoanAmount', 'moraRunHour', 'reminderRunHour'] as const) {
      if (input[k] !== undefined) settings[k] = input[k];
    }
    for (const k of ['requireBaseOnCashOpen', 'collectorCanCreateLoan', 'collectorCanEditInstallment', 'collectorCanDiscount', 'collectorCanWaiveLateFee', 'notifyPaymentReceived', 'notifyOverdue', 'notifyNewLoan', 'notifyDailySummary', 'notifyChannelEmail', 'notifyChannelPush'] as const) {
      if (input[k] !== undefined) settings[k] = input[k];
    }

    // columnas del Tenant
    const data: Record<string, unknown> = { settings };
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.legalId !== undefined) data.legalId = input.legalId.trim() || null;
    if (input.countryCode !== undefined) data.countryCode = input.countryCode.trim().toUpperCase();
    if (input.currency !== undefined) data.currency = input.currency.trim().toUpperCase();
    if (input.timezone !== undefined) data.timezone = input.timezone.trim();

    await db.tenant.update({ where: { id: tenantId }, data });
    return this.organization(tenantId);
  }

  async auditLogs(tenantId: string): Promise<OrgAuditLogModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const rows = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
    const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId ?? undefined,
      userName: r.userId ? nameById.get(r.userId) : undefined,
      ip: r.ip ?? undefined,
      createdAt: r.createdAt,
    }));
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
    // Invitar a alguien convierte el espacio personal en una organización.
    if (org.type !== 'ORGANIZATION') {
      await db.tenant.update({ where: { id: tenantId }, data: { type: 'ORGANIZATION' } });
    }
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

  // ---- roles y permisos ----
  async roles(tenantId: string): Promise<OrgRoleModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const count = await db.role.count();
    if (count === 0) {
      // Sembrar roles del sistema la primera vez.
      await db.role.createMany({
        data: SYSTEM_ROLES.map((r) => ({ tenantId, key: r.key, name: r.name, permissions: r.permissions, isSystem: true })),
      });
    }
    const rows = await db.role.findMany({ orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((r) => ({ id: r.id, key: r.key, name: r.name, permissions: (r.permissions as string[]) ?? [], isSystem: r.isSystem }));
  }

  async createRole(tenantId: string, name: string, permissions: string[]): Promise<OrgRoleModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const key = slugify(name) + '-' + Math.random().toString(36).slice(2, 6);
    await db.role.create({ data: { tenantId, key, name: name.trim(), permissions: sanitizePerms(permissions), isSystem: false } });
    return this.roles(tenantId);
  }

  async updateRole(tenantId: string, id: string, name: string | undefined, permissions: string[] | undefined): Promise<OrgRoleModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const role = await db.role.findFirstOrThrow({ where: { id } });
    const data: Record<string, unknown> = {};
    if (permissions !== undefined) data.permissions = sanitizePerms(permissions);
    if (name !== undefined && !role.isSystem) data.name = name.trim(); // no renombrar roles del sistema
    await db.role.update({ where: { id }, data });
    return this.roles(tenantId);
  }

  async deleteRole(tenantId: string, id: string): Promise<OrgRoleModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const role = await db.role.findFirstOrThrow({ where: { id } });
    if (role.isSystem) throw new BadRequestException('No se pueden eliminar los roles del sistema.');
    await db.role.delete({ where: { id } });
    return this.roles(tenantId);
  }
}

// Catálogo de permisos disponibles (claves) y roles base.
export const PERMISSIONS = [
  'view_portfolio', 'register_payments', 'manage_loans', 'manage_clients',
  'manage_routes', 'view_finance', 'manage_members', 'org_settings', 'delete_members',
];
const ALL = PERMISSIONS;
const SYSTEM_ROLES = [
  { key: 'owner', name: 'Dueño', permissions: ALL },
  { key: 'admin', name: 'Administrador', permissions: ALL },
  { key: 'manager', name: 'Supervisor', permissions: ['view_portfolio', 'register_payments', 'manage_loans', 'manage_clients', 'manage_routes', 'view_finance'] },
  { key: 'collector', name: 'Cobrador', permissions: ['view_portfolio', 'register_payments', 'manage_loans', 'manage_clients'] },
  { key: 'viewer', name: 'Consulta', permissions: ['view_portfolio'] },
];
function sanitizePerms(perms: string[]): string[] {
  return [...new Set(perms.filter((p) => PERMISSIONS.includes(p)))];
}
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rol';
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function roleLabel(role: UserRole): string {
  return ({ OWNER: 'Dueño', ADMIN: 'Administrador', MANAGER: 'Supervisor', COLLECTOR: 'Cobrador', VIEWER: 'Consulta' } as Record<string, string>)[role] ?? role;
}
