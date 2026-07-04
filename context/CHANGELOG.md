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

<!-- Plantilla para próximas entradas:
## AAAA-MM-DD — Título
- **[tipo]** descripción   (tipo ∈ decisión/infra/db/backend/app/web/seguridad/pendiente/fix)
-->
