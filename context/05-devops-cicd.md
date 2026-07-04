# DevOps, CI/CD y despliegue

## Entornos
| Entorno | DB | Redis | Notas |
|---|---|---|---|
| local | Postgres 17 (Docker) | Redis (Docker) | `pnpm db:up` |
| staging | Postgres gestionado | Redis gestionado | migraciones auto en deploy |
| prod | Postgres gestionado + réplica lectura + PgBouncer | Redis/cluster | RLS activado, sin playground |

Cambiar de local a nube = cambiar `DATABASE_URL`/`REDIS_URL` en el gestor de secretos. Cero cambios de código (ADR-001).

## Pipeline CI/CD recomendado (GitHub Actions)
```
on: [pull_request, push:main]
jobs:
  1. setup      → pnpm install (cache), turbo cache
  2. lint       → turbo run lint
  3. typecheck  → turbo run typecheck
  4. test       → turbo run test (unit + e2e con Postgres de servicio)
  5. security   → pnpm audit --prod, CodeQL, Trivy (imágenes)
  6. build      → turbo run build; docker build de services (multi-stage)
  7. migrate    → prisma migrate deploy (solo staging/prod, gate manual a prod)
  8. deploy     → push imagen + rollout (staging auto, prod con approval)
```
Reglas: PR no mergea sin lint+typecheck+test verdes. `prisma migrate deploy` (nunca `dev`) en CI.
Migraciones **backward-compatible** (expand/contract) para deploys sin downtime.

## Contenerización
- `services/Dockerfile`: multi-stage (deps → build → runtime distroless/alpine, usuario no-root,
  `HEALTHCHECK` a `/health`).
- App Expo: **EAS Build/Submit** + **OTA updates** (no va en Docker).
- Web Next.js: build estático/SSR en Vercel o contenedor Node.

## Orquestación a escala (Kubernetes)
- `Deployment` de la API con HPA (CPU + p95 latencia) y `PodDisruptionBudget`.
- WebSockets: `sessionAffinity`/sticky no requerido gracias al **Redis adapter** de Socket.IO.
- Worker de BullMQ como `Deployment` separado (escala independiente de la API).
- Secrets vía `ExternalSecrets`/gestor gestionado. Config vía `ConfigMap`.
- Postgres/Redis **fuera** del cluster (servicios gestionados) o vía operador con backups.

## Observabilidad
- **Logs** estructurados JSON (pino) con `tenantId`/`requestId`, PII redactada.
- **Métricas** Prometheus (`/metrics`): latencia GraphQL, tasa de error, lag de colas BullMQ,
  conexiones WS, pool de DB.
- **Trazas** OpenTelemetry (OTLP) → Tempo/Jaeger.
- **Errores** Sentry (DSN por env).
- **Alertas**: p95 > umbral, error rate, cola atascada, DB connections saturadas.

## Checklist de despliegue a producción
- [ ] `.env` de prod en gestor de secretos; secretos JWT fuertes y rotables.
- [ ] `NODE_ENV=production`, playground/introspection GraphQL **off**.
- [ ] Migraciones aplicadas (`migrate deploy`) y probadas en staging.
- [ ] RLS activado y verificado (test de aislamiento entre tenants).
- [ ] Backups automáticos + restore probado; PITR habilitado.
- [ ] Rate limiting, helmet, CORS allow-list confirmados.
- [ ] Healthchecks (`/health` liveness + readiness que verifica DB/Redis).
- [ ] HPA y límites de recursos definidos; prueba de carga (k6) del flujo de abonos.
- [ ] Dashboards y alertas activos; runbook de incidentes.
- [ ] Plan de rollback (imagen anterior + migración contract-safe).
```
