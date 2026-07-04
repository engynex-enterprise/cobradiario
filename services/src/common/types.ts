import { UserRole } from '@prisma/client';

/** Identidad resuelta desde el JWT y adjuntada al request. */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

/** Payload del access token. */
export interface AccessTokenPayload {
  sub: string; // userId
  tid: string; // tenantId
  role: UserRole;
  email: string;
}
