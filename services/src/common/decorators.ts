import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { AuthContext } from './types';

/** Marca un resolver como público (sin autenticación). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Roles permitidos para un resolver. Usar con RolesGuard. */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Permisos requeridos (todos) para un resolver. Usar con PermissionsGuard. */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/** Inyecta la identidad autenticada (AuthContext) en el parámetro del resolver. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user as AuthContext;
  },
);
