# Cobro Diario — Visión general del sistema

> Documento vivo. Toda decisión de negocio o arquitectura relevante se registra aquí
> o en los documentos hermanos de esta carpeta. Ver `CHANGELOG.md` para el historial.

## Qué es
Plataforma **SaaS multi-tenant** para gestión de **cobro diario** (préstamos "gota a gota" /
microcrédito informal y formal). Digitaliza el ciclo completo: originación del crédito,
generación de plan de pagos, cobro en ruta con geolocalización, arqueo de caja,
notificaciones/recordatorios y reportería, en tiempo real.

## Decisiones de producto confirmadas (2026-07-03)
1. **Tenancy:** multi-tenant. Un `Tenant` puede ser una **ORGANIZACIÓN** (empresa prestamista
   con varios cobradores) **o una PERSONA INDIVIDUAL** que presta por su cuenta. Mismo modelo,
   distinto `Tenant.type`. Aislamiento de datos por `tenantId` + (opcional) RLS de Postgres.
2. **Motor de crédito 100% configurable:** entidad `CreditProduct` parametriza método de
   interés (fijo/flat, saldo decreciente, o custom), frecuencia (diario/semanal/…), plazo,
   mora, gracia y redondeos. Cada crédito referencia un producto y **congela** su config.
3. **Realtime:** Socket.IO + Redis adapter y GraphQL Subscriptions (Redis PubSub).
4. **Notificaciones/recordatorios:** push (Expo/FCM), in-app y programados (BullMQ + Redis).
5. **Alcance actual:** Fundación — monorepo, DB, backend NestJS/GraphQL base con auth.

## Stack
| Capa        | Tecnología                                                    |
|-------------|---------------------------------------------------------------|
| DB          | PostgreSQL 17                                                 |
| ORM         | **Prisma** (ver ADR-001)                                      |
| Backend     | NestJS 11 + GraphQL (code-first, Apollo) + Socket.IO + BullMQ |
| App móvil   | React Native + **Expo (SDK 57)** + Expo Router (ver ADR-002)  |
| Web admin   | Next.js (App Router) + React + shadcn/ui + TanStack Query     |
| Realtime    | Socket.IO + Redis; GraphQL Subscriptions                     |
| Auth        | JWT access/refresh con rotación + RBAC                        |
| Infra local | Docker Compose (Postgres + Redis)                            |

## Estructura del monorepo
```
cobradiario/
├─ services/        # @cobradiario/api  — Backend NestJS + GraphQL + Prisma
├─ app/             # @cobradiario/app  — App móvil Expo (cobradores/clientes)
├─ web/             # @cobradiario/web  — Panel admin Next.js (dueños/supervisores)
├─ packages/        # librerías compartidas (tipos, sdk graphql, motor de crédito)
├─ context/         # 📚 esta documentación
├─ docker-compose.yml
├─ .env.example
├─ pnpm-workspace.yaml
└─ turbo.json
```

## Cómo arrancar (local)
```bash
cp .env.example .env          # 1. configurar entorno
pnpm install                  # 2. instalar (monorepo)
pnpm db:up                    # 3. Postgres + Redis en Docker
pnpm api:migrate              # 4. crear schema en la DB
pnpm api:seed                 # 5. datos demo (tenant, usuarios, productos)
pnpm api:dev                  # 6. API en http://localhost:4000/graphql
```

## Mapa de la documentación
- `01-architecture.md` — arquitectura, capas, flujos, cuellos de botella y escalabilidad.
- `02-domain-model.md` — modelo de dominio, entidades, reglas de negocio, motor de crédito.
- `03-adr-decisions.md` — Architecture Decision Records (por qué de cada elección).
- `04-security.md` — modelo de amenazas, controles, checklist.
- `05-devops-cicd.md` — CI/CD, despliegue, observabilidad, escalado.
- `CHANGELOG.md` — bitácora de cambios de arquitectura/dominio.
