# Architecture Decision Records (ADR)

Formato: contexto → decisión → alternativas → consecuencias.

## ADR-001 — ORM: Prisma
**Contexto.** Necesitamos type-safety end-to-end, migraciones versionadas y velocidad de
desarrollo con NestJS/TypeScript.
**Decisión.** **Prisma** como ORM.
**Alternativas.** Drizzle (más cercano a SQL, excelente para RLS, bundle menor) · TypeORM (maduro
pero decoradores frágiles) · Kysely (query builder puro).
**Por qué Prisma.** Migraciones declarativas robustas, DX y tipos generados superiores, `Prisma
Client Extensions` permiten inyectar `tenantId` de forma central (clave para multi-tenancy),
Decimal nativo para dinero, y `relationJoins` para mitigar N+1. Drizzle fue el finalista; se
prefirió Prisma por madurez de migraciones y ecosistema con Nest.
**Consecuencias.** Para RLS de Postgres usaremos SQL crudo en migraciones + `SET app.tenant_id`
por request. Vigilar el pooling (PgBouncer + `connection_limit`).

## ADR-002 — App móvil: Expo (SDK 57) + Expo Router
**Contexto.** El usuario pidió React Native "y un framework recomendado".
**Decisión.** **Expo** (managed workflow) con **Expo Router** y **EAS** para builds/OTA.
**Alternativas.** RN CLI puro (más control nativo, más fricción) · Ignite boilerplate.
**Por qué Expo.** OTA updates (crítico para desplegar fixes a cobradores en campo sin pasar por
tiendas), EAS Build/Submit, ecosistema de notificaciones push, sensores/geo y cámara listos.
**Consecuencias.** Si algún módulo nativo no soportado aparece, se usa *development build* /
config plugins (sin eject). Offline-first con WatermelonDB.

## ADR-003 — Realtime: Socket.IO + Redis adapter y GraphQL Subscriptions
**Decisión.** Socket.IO para eventos push a la app/web (salas por tenant y por ruta) y GraphQL
Subscriptions (Redis PubSub) para el panel admin integrado al grafo.
**Por qué.** Socket.IO da reconexión, salas y fallback; el **Redis adapter** permite escalar WS
horizontalmente (varias instancias, mismas salas). Redis PubSub respalda las subscriptions.
**Consecuencias.** Redis pasa a ser dependencia de infraestructura de primera clase.

## ADR-004 — Colas y jobs: BullMQ (Redis)
**Decisión.** BullMQ para recordatorios programados, cálculo nocturno de mora, envío de push y
generación de reportes.
**Por qué.** Reintentos, backoff, jobs repetibles (cron), particionables por tenant. Reutiliza
el Redis ya presente.

## ADR-005 — Autenticación: JWT access/refresh con rotación + RBAC
**Decisión.** Access token corto (15 min) + refresh token largo (14 d) **rotado** y almacenado
hasheado en DB (`RefreshToken`) para permitir revocación. RBAC por `UserRole`.
**Por qué.** Stateless para escalar horizontalmente; refresh en DB permite logout real y
detección de reuso (robo de token). Passwords con bcrypt (rounds configurable).
**Consecuencias.** Requiere endpoint de refresh y limpieza de tokens expirados (job).

## ADR-006 — Monorepo: pnpm workspaces + Turborepo
**Decisión.** Un repo con `services`, `app`, `web`, `packages/*`.
**Por qué.** Compartir tipos y el SDK GraphQL entre app/web, caché de tareas de Turbo, un solo
flujo de CI. pnpm por velocidad y `node_modules` eficiente.

## ADR-007 — GraphQL code-first (NestJS + Apollo)
**Decisión.** Esquema generado desde clases TypeScript (decoradores), no SDL manual.
**Por qué.** Una sola fuente de verdad (los tipos TS), menos drift entre schema y resolvers.

## ADR-008 — Multi-tenancy shared-schema + tenantId (+ RLS en prod)
Ver `01-architecture.md` §3. Se eligió shared-schema por costo/operación frente a schema-per-tenant
o db-per-tenant, con RLS como defensa en profundidad.
