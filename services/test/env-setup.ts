/**
 * Fija el entorno de TEST antes de que se cargue la app.
 * Usa una base de datos separada (cobradiario_test) para no tocar datos de desarrollo.
 * Runtime como app_user (RLS activo); migraciones/seed como dueño.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://app_user:app_user_pwd@localhost:5432/cobradiario_test?schema=public';
process.env.DIRECT_URL =
  'postgresql://cobradiario:cobradiario_dev_pwd@localhost:5432/cobradiario_test?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.JWT_ACCESS_TTL = '900';
process.env.JWT_REFRESH_TTL = '1209600';
process.env.BCRYPT_ROUNDS = '4'; // más rápido en tests
process.env.API_PORT = '0';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.GRAPHQL_PLAYGROUND = 'false';
