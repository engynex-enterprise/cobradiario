-- =============================================================================
-- Row-Level Security (RLS) multi-tenant — defensa en profundidad.
-- Ver context/01-architecture.md §3 y context/04-security.md (amenaza #1).
--
-- Modelo:
--  * La app se conecta como el rol NO-superusuario `app_user` → las políticas RLS
--    se aplican (un superusuario o el dueño de la tabla sin FORCE las ignoraría).
--  * Cada request fija `app.tenant_id` (GUC local a la transacción). Las políticas
--    solo dejan ver/escribir filas de ese tenant.
--  * Operaciones de sistema/auth (login, barridos cross-tenant) fijan `app.bypass_rls`.
--    Parametrizamos todo con Prisma (sin SQL string-concat), por lo que el bypass GUC
--    no es alcanzable por inyección. Tradeoff documentado en ADR/seguridad.
-- =============================================================================

-- 1) Tabla `tenants`: aislamiento por su propia PK.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenants"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "id" = current_setting('app.tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "id" = current_setting('app.tenant_id', true));

-- 2) Resto de tablas de negocio: aislamiento por columna "tenantId".
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','memberships','clients','routes','route_collectors','credit_products',
    'loans','installments','payments','payment_allocations','cash_boxes',
    'cash_movements','ledger_entries','notifications','device_tokens','reminders','audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (current_setting(''app.bypass_rls'', true) = ''on'' OR "tenantId" = current_setting(''app.tenant_id'', true)) '
      || 'WITH CHECK (current_setting(''app.bypass_rls'', true) = ''on'' OR "tenantId" = current_setting(''app.tenant_id'', true))',
      t
    );
  END LOOP;
END $$;

-- 3) Rol de aplicación de mínimos privilegios (no superusuario, no dueño de tablas).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_pwd';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- Privilegios por defecto para objetos futuros (nuevas tablas de próximas migraciones).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
