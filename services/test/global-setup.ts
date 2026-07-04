import { execSync } from 'node:child_process';

/**
 * Prepara la base de datos de test una sola vez: la crea (si no existe) y aplica migraciones
 * (incluida la de RLS, que crea políticas y concede permisos a app_user en esta DB).
 */
const OWNER = 'postgresql://cobradiario:cobradiario_dev_pwd@localhost:5432';
const TEST_DB = 'cobradiario_test';

export default async function globalSetup(): Promise<void> {
  // Crear la DB de test (ignora el error si ya existe).
  try {
    execSync(`psql "${OWNER}/postgres" -c "CREATE DATABASE ${TEST_DB}"`, { stdio: 'ignore' });
  } catch {
    /* ya existe */
  }

  // Aplicar migraciones como dueño.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DIRECT_URL: `${OWNER}/${TEST_DB}?schema=public`,
      DATABASE_URL: `${OWNER}/${TEST_DB}?schema=public`,
    },
  });
}
