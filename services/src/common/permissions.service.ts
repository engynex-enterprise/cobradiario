import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_KEY_BY_ENUM, SYSTEM_ROLE_DEFAULTS } from './permissions';

/**
 * Resuelve los permisos EFECTIVOS de un miembro. Los permisos son data-driven:
 * el administrador puede editar los permisos de cada rol del sistema (tabla `roles`)
 * y eso cambia lo que ese rol puede hacer. El OWNER es superusuario (no se le puede
 * dejar sin acceso). Si el rol aún no está sembrado, se usan los valores por defecto.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(tenantId: string, role: UserRole): Promise<Set<string>> {
    if (role === UserRole.OWNER) return new Set(SYSTEM_ROLE_DEFAULTS.owner);
    const key = ROLE_KEY_BY_ENUM[role] ?? 'viewer';
    const row = await this.prisma.forTenant(tenantId).role.findFirst({ where: { key } });
    const perms = (row?.permissions as string[] | undefined) ?? SYSTEM_ROLE_DEFAULTS[key] ?? [];
    return new Set(perms);
  }

  async has(tenantId: string, role: UserRole, permission: string): Promise<boolean> {
    if (role === UserRole.OWNER) return true;
    const set = await this.forUser(tenantId, role);
    return set.has(permission);
  }
}
