import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators';
import { AuthContext } from '../types';

/**
 * Autorización por rol (RBAC). Se ejecuta después de GqlAuthGuard.
 * La verificación crítica de permisos debe repetirse también en el service
 * (defensa en profundidad), no solo aquí.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as AuthContext | undefined;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta operación');
    }
    return true;
  }
}
