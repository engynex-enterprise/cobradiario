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

## 2026-07-03 — Vertical slice: Clientes + Créditos + Pagos (realtime)
- **[backend]** `ClientsModule` (crear/listar), `LoansModule` (`createLoan`: genera plan con el
  motor + persiste Loan + Installment[] + LedgerEntry de desembolso en transacción, congela
  `terms`), `PaymentsModule` (`registerPayment`: bloqueo de fila `FOR UPDATE`, asignación FIFO,
  Payment + PaymentAllocation[] + actualización de cuotas/crédito + LedgerEntry, **idempotencia**
  por `clientRequestId`, emisión de evento realtime `payment.registered`).
- **[realtime]** Evento `payment.registered` emitido a la sala `tenant:{id}` vía Socket.IO
  (Redis adapter). Verificado con cliente WS real.
- **[test/verificación]** Probado end-to-end por GraphQL: login → createLoan (100k @20%/20 →
  20 cuotas de 6.000, total 120.000 exacto) → registerPayment (saldo 120k→114k, cuota #1 PAID)
  → idempotencia (2º intento no recobra) → evento realtime recibido en vivo.
- **[deuda]** Sobrepago (`leftover`) se devuelve pero no se persiste como saldo a favor aún;
  Decimal se expone como Float GraphQL (revisar scalar Decimal para sumas muy grandes);
  mora (`calcLateFee`) aún no se aplica automáticamente por job nocturno.

## 2026-07-03 — Web panel (Next.js 15 + shadcn) + query de productos

- **[web]** App `@cobradiario/web`: login, dashboard con stats (cartera/recaudado/activos),
  tabla de cartera, diálogo de nuevo crédito y de abono. Componentes estilo shadcn (button,
  card, input, dialog, table, badge) + Tailwind + sonner. Cliente GraphQL con fetch + tokens
  en localStorage; guard de sesión.
- **[web/realtime]** El dashboard se suscribe a `payment.registered` (Socket.IO con JWT) y
  refresca la cartera + toast al entrar un abono. Indicador "En vivo".
- **[backend]** Nuevo `ProductsModule` con query `creditProducts` (necesaria para el formulario).
- **[verificación]** `next build` OK (6 rutas); páginas sirven (200, render correcto); CORS de
  :3000→:4000 verificado (preflight + POST); query `creditProducts` devuelve el producto del seed.
- **[pendiente]** Refresh automático de token (401→refresh) en el cliente web; detalle de crédito
  con plan de cuotas; rutas/cobradores; gráficas.

## 2026-07-03 — App móvil del cobrador (Expo + React Native)

- **[app]** `@cobradiario/app` con Expo SDK 57 / RN 0.86 / Expo Router: login, ruta del día
  (cartera), registro de abonos y realtime. Tokens en expo-secure-store; guard de sesión.
- **[app/offline]** Cola de abonos offline-first (`offline-queue.ts`) en AsyncStorage con
  `clientRequestId` único → se apoya en la idempotencia del backend para no duplicar cobros;
  drena al recuperar señal (errores de red se reintentan, de negocio se descartan).
- **[app/realtime]** Suscripción a `payment.registered` (Socket.IO con JWT) → refresca cartera.
- **[verificación]** `tsc --noEmit` limpio; `expo export --platform ios` empaqueta 1580 módulos
  (bundle Hermes OK) — verificación de bundle sin dispositivo.
- **[pendiente]** Modal propio para abono en Android (hoy `Alert.prompt` es iOS-only); NetInfo
  para auto-flush; geolocalización y push. Con esto los 3 clientes (web+móvil+API) están sobre
  la misma base verificada.

## 2026-07-03 — Jobs BullMQ: mora nocturna + recordatorios + notificaciones/push

- **[backend]** Colas BullMQ (Redis): `maintenance` (barrido de mora + recordatorios) y `push`.
  `BullModule.forRootAsync` con conexión parseada de `REDIS_URL`.
- **[backend]** `NotificationsModule`: crear notificación (persist + realtime `notification`),
  `myNotifications`, `markNotificationRead`, `registerDeviceToken`; envío push vía Expo Push API
  en `PushProcessor` (cola `push`).
- **[backend]** `MaintenanceModule`: `runOverdueSweep` (marca cuotas OVERDUE + calcula mora con
  `calcLateFee`, notifica créditos que caen en mora) y `runDueReminders` (avisa cuotas próximas,
  con dedup vía tabla `Reminder`). Worker + `MaintenanceScheduler` con cron repetible
  (mora 02:00, recordatorios 07:00). Mutations admin para disparo manual.
- **[db/seed]** Nuevo producto `demo-product-mora` (DAILY_PERCENT 1%/día) para demostrar mora.
- **[verificación]** End-to-end vía BullMQ real: crédito con cuotas vencidas → `runOverdueSweep`
  encola job → worker marca 6 cuotas OVERDUE con mora correcta (360/300/240… = 6.000×1%×días) +
  notificación LOAN_OVERDUE. Idempotencia OK (2º barrido no duplica aviso). Recordatorios OK.
- **[pendiente]** Barrido particionado por tenant respetando su timezone; reintentos/backoff y
  panel de estado de colas; push real requiere device tokens de la app (infra lista).

## 2026-07-03 — Arqueo de caja (CashBox)

- **[backend]** `CashBoxModule`: `openCashBox` (saldo inicial + movimiento OPENING; impide doble
  apertura), `addCashMovement` (EXPENSE/DISBURSEMENT/DEPOSIT/ADJUSTMENT; bloquea COLLECTION/OPENING
  manuales), `closeCashBox` (calcula esperado vs. contado → diferencia/descuadre), `myOpenCashBox`.
- **[backend]** Integración con pagos: al registrar un abono, si el cobrador tiene caja abierta,
  el pago se enlaza (`cashBoxId`) y se crea automáticamente un movimiento `COLLECTION`.
- **[backend]** Saldo esperado por signos de movimiento: OPENING/COLLECTION/ADJUSTMENT(+),
  DISBURSEMENT/EXPENSE/DEPOSIT(−). En caja abierta se calcula en vivo; al cerrar se persiste.
- **[verificación]** Flujo end-to-end: abrir \$50.000 → abono \$6.000 (COLLECTION automático) →
  gasto \$2.000 → esperado \$54.000 → cierre contando \$53.500 → diferencia −\$500 (faltante).
  Guards verificados: doble apertura y COLLECTION manual rechazados; caja null tras cierre.
- **[pendiente]** RLS Postgres (tarea transversal siguiente); reportes de caja por rango/cobrador;
  UI de caja en web y app.

## 2026-07-03 — Row-Level Security (RLS) multi-tenant

- **[seguridad/db]** Migración `20260704120000_rls_multitenant`: `ENABLE/FORCE ROW LEVEL SECURITY`
  + política `tenant_isolation` (USING/WITH CHECK) en las 18 tablas de negocio. Rol de app
  `app_user` (mínimos privilegios, NO superusuario) para que RLS aplique de verdad.
- **[config]** La app runtime se conecta como `app_user` (`DATABASE_URL`); migraciones/seed/admin
  usan el dueño (`DIRECT_URL`). Cambiar de local a nube sigue siendo solo esas dos URLs.
- **[backend]** `PrismaService.forTenant(tenantId)` fija `app.tenant_id` (GUC local a la tx) e
  inyecta tenantId (belt); `system()` activa `app.bypass_rls` para auth/jobs cross-tenant;
  `setTenantGuc(tx)` para transacciones interactivas (loans/payments/cashbox). Servicios
  refactorizados para usarlos.
- **[verificación]** Aislamiento probado: tenant B recién registrado ve 0 clientes/créditos/
  productos de A; cada uno solo ve lo suyo (nivel DB, no solo app). Todos los flujos siguen OK
  bajo RLS: login, createLoan, registerPayment (tx+row lock), caja (open/close batch), mora.
- **[nota]** El bypass es un GUC; como todo se parametriza con Prisma (sin SQL concatenado) no es
  alcanzable por inyección. Endurecimiento futuro: conexión de sistema separada en vez de GUC.

## 2026-07-03 — Tests e2e automatizados + CI (GitHub Actions)

- **[test]** Suite e2e del backend (`services/test/app.e2e-spec.ts`) contra la app real
  (GraphQL/HTTP) y Postgres con RLS, en DB separada `cobradiario_test` (globalSetup crea+migra).
  Cubre: auth (register/login/me/credenciales inválidas/sin token), **aislamiento multi-tenant**,
  ciclo crédito (producto→cliente→crédito→abono) + **idempotencia**, y **arqueo de caja**.
  6/6 verdes. Junto a los 23 unit del motor → **29 tests**.
- **[backend]** Nuevo mutation `createCreditProduct` (OWNER/ADMIN) — necesario para los tests y
  para gestionar productos desde la web/app.
- **[ci]** `.github/workflows/ci.yml`: Postgres 17 + Redis de servicio; install → prisma generate
  → build motor → unit tests → migrate (crea RLS/app_user) → typecheck (api+web) → e2e → build
  (api+web). Hace realidad el pipeline de `05-devops-cicd.md`.
- **[pendiente]** Lint (falta config eslint) fuera de CI por ahora; más cobertura (mora/reminders
  como jobs); tests de la web (Playwright) y de la app.

<!-- Plantilla para próximas entradas:
## AAAA-MM-DD — Título
- **[tipo]** descripción   (tipo ∈ decisión/infra/db/backend/app/web/seguridad/pendiente/fix)
-->
