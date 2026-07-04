# Cobro Diario — Plataforma SaaS

Plataforma multi-tenant de **cobro diario** (gota a gota / microcrédito): originación de créditos,
plan de pagos, cobro en ruta, caja, realtime, notificaciones y reportería.

📚 **Toda la documentación de arquitectura vive en [`context/`](./context/00-overview.md)** —
empieza por `context/00-overview.md`.

## Stack
Postgres 17 · **Prisma** · NestJS 11 + GraphQL · Expo (RN) · Next.js + shadcn · Socket.IO + Redis · BullMQ.

## Arranque rápido (local)
```bash
cp .env.example .env          # configurar entorno (cloud-ready)
pnpm install                  # instalar monorepo
pnpm db:up                    # Postgres + Redis (Docker)
pnpm api:migrate              # aplicar schema
pnpm api:seed                 # datos demo
pnpm api:dev                  # API → http://localhost:4000/graphql
```
Credenciales demo: `owner@demo.com` / `Password123` · `cobrador@demo.com` / `Password123`.

### Probar el login (GraphQL)
```graphql
mutation { login(input: { email: "owner@demo.com", password: "Password123" }) {
  accessToken refreshToken user { id email role }
} }
```

## Estructura
| Carpeta | Paquete | Estado |
|---|---|---|
| `services/` | `@cobradiario/api` — Backend NestJS/GraphQL/Prisma | ✅ Fundación funcional (auth, DB, realtime base) |
| `app/` | `@cobradiario/app` — App móvil Expo | ⏳ Siguiente fase |
| `web/` | `@cobradiario/web` — Panel admin Next.js + shadcn | ⏳ Siguiente fase |
| `packages/` | librerías compartidas (tipos, motor de crédito, sdk gql) | ⏳ Siguiente fase |
| `context/` | 📚 documentación de arquitectura y decisiones | ✅ |

## Migrar a la nube
Cambiar únicamente `DATABASE_URL` y `REDIS_URL` en el `.env` (o gestor de secretos).
Ningún código depende del host. Ver `context/05-devops-cicd.md`.

## Scripts útiles (raíz)
| Comando | Acción |
|---|---|
| `pnpm db:up` / `pnpm db:down` | Levantar / bajar Postgres+Redis |
| `pnpm api:dev` | API en modo watch |
| `pnpm api:studio` | Prisma Studio (explorar la DB) |
| `pnpm typecheck` / `pnpm build` | Verificación de tipos / build |
