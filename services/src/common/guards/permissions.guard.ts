import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PERMISSIONS_KEY } from '../decorators';
import { AuthContext } from '../types';
import { PermissionsService } from '../permissions.service';

/**
 * Autorización por permiso (data-driven). Se ejecuta después de RolesGuard.
 * Requiere que el usuario tenga TODOS los permisos declarados en @RequirePermissions.
 * El OWNER siempre pasa (superusuario, no se le puede bloquear).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as AuthContext | undefined;
    if (!user) throw new ForbiddenException('No tienes permisos para esta operación');

    const granted = await this.permissions.forUser(user.tenantId, user.role);
    const ok = required.every((p) => granted.has(p));
    if (!ok) throw new ForbiddenException('No tienes permisos para esta operación');
    return true;
  }
}
