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

<!-- Plantilla para próximas entradas:
## AAAA-MM-DD — Título
- **[tipo]** descripción   (tipo ∈ decisión/infra/db/backend/app/web/seguridad/pendiente/fix)
-->
```
