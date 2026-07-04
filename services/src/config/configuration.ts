/**
 * Configuración tipada y validada del entorno.
 * Un solo punto de verdad; el resto de la app la consume vía ConfigService.
 * Migrar a la nube = cambiar DATABASE_URL/REDIS_URL en el entorno. Sin tocar código.
 */
export interface AppConfig {
  env: string;
  api: { host: string; port: number; corsOrigins: string[]; playground: boolean };
  database: { url: string; directUrl?: string };
  redis: { url: string };
  jwt: {
    accessSecret: string;
    accessTtl: number;
    refreshSecret: string;
    refreshTtl: number;
    bcryptRounds: number;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[config] Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`[config] ${name} debe ser numérica`);
  return parsed;
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  api: {
    host: process.env.API_HOST ?? '0.0.0.0',
    port: num('API_PORT', 4000),
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    playground: process.env.GRAPHQL_PLAYGROUND === 'true',
  },
  database: {
    url: required('DATABASE_URL'),
    directUrl: process.env.DIRECT_URL,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessTtl: num('JWT_ACCESS_TTL', 900),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshTtl: num('JWT_REFRESH_TTL', 1209600),
    bcryptRounds: num('BCRYPT_ROUNDS', 12),
  },
});
