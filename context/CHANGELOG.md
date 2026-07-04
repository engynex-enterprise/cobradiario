# CHANGELOG — Arquitectura y dominio

Bitácora de decisiones y cambios estructurales. Formato: fecha · tipo · descripción.

## 2026-07-03 — Fundación del proyecto
- **[decisión]** Producto: SaaS multi-tenant; `Tenant` puede ser ORGANIZACIÓN o INDIVIDUAL.
- **[decisión]** Motor de crédito 100% configurable vía `CreditProduct` (FLAT/DECLINING/CUSTOM).
- **[decisión]** Stack: Postgres 17 · Prisma · NestJS 11 + GraphQL · Expo · Next.js+shadcn ·
  Socket.IO+Redis · BullMQ. Ver `03-adr-decisions.md`.
- **[infra]** Monorepo pnpm + Turborepo. `docker-compose.yml` (Postgres + Redis). `.env.example`
  cloud-ready (cambiar solo `DATABASE_URL`/`REDIS_URL` para migrar a nube).
- **[db]** Schema Prisma completo del dominio (tenancy, usuarios/roles, clientes, productos,
  créditos, cuotas, pagos, caja, notificaciones, ledger, auditoría).
- **[backend]** Base NestJS: config validada, PrismaModule, Auth (register/login/refresh/me con
  JWT rotado + RBAC), Health. Módulos de dominio scaffolded.
- **[pendiente]** Implementar motor de crédito y allocation de pagos · RLS Postgres · realtime
  gateway completo · colas de recordatorios/mora · app Expo · web Next.js.

## 2026-07-03 — Motor de crédito (packages/credit-engine)
- **[backend]** Nuevo paquete puro `@cobradiario/credit-engine` (sin deps de DB/framework,
  dinero con `decimal.js`): `generateSchedule` (FLAT · DECLINING_BALANCE · CUSTOM con registro
  de estrategias), `allocatePayment` (FIFO, mora primero, sobrepago→leftover), `calcLateFee`
  (FIXED/PERCENT/DAILY_PERCENT + días de gracia), redondeo configurable a múltiplos.
- **[test]** 23 pruebas unitarias (node:test) verdes: cuadre exacto de cuotas con redondeo,
  liquidación de saldo en amortización, FIFO, sobrepago, validaciones, mora.
- **[pendiente]** Módulos de dominio NestJS que consumen el motor (loans/payments) dentro de
  transacción + emisión de eventos realtime; estrategia CUSTOM de ejemplo si se requiere.

<!-- Plantilla para próximas entradas:
## AAAA-MM-DD — Título
- **[tipo]** descripción   (tipo ∈ decisión/infra/db/backend/app/web/seguridad/pendiente/fix)
-->
```
