import { UserRole } from '@prisma/client';

/**
 * Catálogo de permisos de la organización. Las claves son la fuente de verdad y deben
 * coincidir con el catálogo del frontend (PERMISSION_CATALOG en el web).
 */
export const PERMISSIONS = [
  'view_portfolio',    // ver cartera, créditos y cuotas
  'register_payments', // registrar abonos
  'manage_loans',      // crear/editar créditos
  'manage_clients',    // crear/editar clientes, fiadores y referencias
  'manage_routes',     // administrar rutas, productos y etiquetas
  'view_finance',      // finanzas, caja, gastos y reportes
  'manage_members',    // invitar miembros y cambiar roles
  'org_settings',      // editar la configuración de la organización
  'delete_members',    // dar de baja miembros
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Mapea el rol del sistema (enum) a la clave del rol en la tabla `roles`. */
export const ROLE_KEY_BY_ENUM: Record<UserRole, string> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  COLLECTOR: 'collector',
  VIEWER: 'viewer',
};

const ALL: string[] = [...PERMISSIONS];

/** Permisos por defecto de cada rol del sistema (usados al sembrar y como respaldo). */
export const SYSTEM_ROLE_DEFAULTS: Record<string, string[]> = {
  owner: ALL,
  admin: ALL,
  manager: ['view_portfolio', 'register_payments', 'manage_loans', 'manage_clients', 'manage_routes', 'view_finance'],
  collector: ['view_portfolio', 'register_payments', 'manage_loans', 'manage_clients'],
  viewer: ['view_portfolio'],
};

/** Definición ordenada de los roles del sistema para sembrar por tenant. */
export const SYSTEM_ROLES: { key: string; name: string; permissions: string[] }[] = [
  { key: 'owner', name: 'Dueño', permissions: SYSTEM_ROLE_DEFAULTS.owner },
  { key: 'admin', name: 'Administrador', permissions: SYSTEM_ROLE_DEFAULTS.admin },
  { key: 'manager', name: 'Supervisor', permissions: SYSTEM_ROLE_DEFAULTS.manager },
  { key: 'collector', name: 'Cobrador', permissions: SYSTEM_ROLE_DEFAULTS.collector },
  { key: 'viewer', name: 'Consulta', permissions: SYSTEM_ROLE_DEFAULTS.viewer },
];

export function sanitizePermissions(perms: string[]): string[] {
  return [...new Set(perms.filter((p) => (PERMISSIONS as readonly string[]).includes(p)))];
}
