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

## 2026-07-03 — Refresh automático de token (web + app)

- **[web + app]** Los clientes GraphQL detectan el error de autenticación (code UNAUTHENTICATED),
  refrescan el token de forma **single-flight** (varias peticiones concurrentes comparten un solo
  refresh) y reintentan la petición original una vez. Si el refresh falla → sesión expirada:
  web emite `auth:expired` (AuthProvider redirige a login), app invoca `setOnAuthExpired`.
- **[web]** `web/src/lib/api.ts` + listener en `auth-provider.tsx`.
- **[app]** `app/src/lib/api.ts` (cachea access+refresh en memoria; persiste en SecureStore) +
  registro del callback en `auth.tsx`.
- **[test]** Nuevo e2e del contrato de refresh: rota tokens, el nuevo access funciona y reusar el
  viejo se revoca (detección de reuso). Suite e2e ahora **7/7**; total con unit → **30 tests**.
- **[verificación]** typecheck app+web OK, build web OK, e2e 7/7.

## 2026-07-03 — UI web: detalle de crédito + caja/arqueo

- **[web]** Página `/dashboard/loan/[id]`: resumen (capital/interés/total/saldo), % pagado y
  **plan de cuotas** (vencimiento, estado, capital/interés/mora/pagado) + abono desde el detalle.
- **[web]** Página `/dashboard/caja`: abrir caja, tabla de movimientos (COLLECTION automáticos +
  manuales), agregar gasto/consignación/desembolso/ajuste, y **cierre con preview del descuadre**.
- **[web]** Navegación: botón "Caja" en el dashboard y "Ver" por crédito hacia el detalle.
- **[web]** Capa GraphQL extendida (`fetchLoanDetail`, `fetchOpenCashBox`, `openCashBox`,
  `addCashMovement`, `closeCashBox`).
- **[verificación]** typecheck + `next build` OK (rutas nuevas generadas); páginas sirven 200;
  las queries exactas de las páginas validadas contra el servidor (detalle con 20 cuotas; ciclo
  de caja abrir→gasto→cerrar con descuadre −500).

## 2026-07-03 — Gestión de rutas y equipo (backend + web) · stack en ejecución

- **[backend]** `RoutesModule`: `routes` (con cobradores), `createRoute`, `assignCollector`
  (evita duplicados). `TeamModule`: `teamMembers`, `createTeamMember` (crea User+Membership con
  bcrypt, dentro de tx con GUC/RLS). Roles: crear restringido a OWNER/ADMIN(/MANAGER).
- **[web]** Página `/dashboard/equipo`: listar/crear usuarios del equipo (con rol), listar/crear
  rutas y asignar cobradores por ruta. Botón "Equipo" en el dashboard.
- **[web]** Capa GraphQL extendida (team + routes).
- **[verificación]** Backend probado por GraphQL (crear cobrador→ruta→asignar→listar OK);
  typecheck web+api OK; páginas sirven 200.
- **[dev]** Stack levantado en modo watch/hot-reload: web http://localhost:3000, API :4000.
  Nota operativa: no ejecutar `next build` mientras corre `next dev` (comparten `.next`).

## 2026-07-04 — Reportes con gráficas (backend stats + web/Recharts)

- **[backend]** `StatsModule` con query `dashboardStats`: cartera pendiente (sum saldo activos),
  recaudado hoy, créditos activos, cuotas en mora, cartera por estado (groupBy) y recaudo de los
  últimos 7 días (bucketizado). Agregados vía `forTenant` (RLS). Límites de día en UTC para que
  `collectedToday` y los buckets coincidan (fix de un desalineo por TZ; per-tenant TZ = futuro).
- **[web]** Página `/dashboard/reportes`: KPIs (tiles) + BarChart de recaudo 7 días + barra
  horizontal de cartera por estado, con Recharts. Botón "Reportes" en el dashboard.
- **[dataviz]** Gráficas de una sola serie (color único + etiquetas de texto → identidad no
  depende del color); grid recesivo, tooltips, ejes en tinta muted. Color de acento `#16a34a`
  validado con el script de la skill (contraste ≥3:1 sobre superficie clara).
- **[verificación]** `dashboardStats` probado por GraphQL (cartera 456k, hoy 24k, 6 en mora);
  typecheck web+api OK; `/dashboard/reportes` compila (Recharts) y sirve 200 sin errores.

## 2026-07-04 — Cartera usable: cliente/ruta + filtro por ruta

- **[backend]** `LoanModel` expone `clientName` y `routeName`; `loans`/`loan`/`createLoan` hacen
  include de client+route y los mapean.
- **[web]** Dashboard: columna Cliente (con ruta debajo), selector "Todas las rutas / …" que
  filtra la cartera (usa `loans(routeId)`); el diálogo de nuevo crédito permite elegir ruta;
  el detalle del crédito muestra nombre del cliente y ruta.
- **[verificación]** Flujo completo por GraphQL: crear crédito en Ruta Centro → `routeName`
  correcto → filtro por ruta lo lista (1). typecheck api+web OK; páginas 200.

## 2026-07-04 — Rediseño UI al sistema de diseño Altipal (orus-pos)

- **[web]** Adoptado el lenguaje visual de orus-pos: azul de marca `#004f9f`, texto navy
  `#0a2540`, fondo `#f4f7fb`, **esquinas rectas (--radius: 0)**, sombras Material (`shadow-soft`),
  canvas neutro (`app-canvas`). `globals.css` + `tailwind.config.ts` reescritos con tokens hex
  (variables CSS directas, no HSL).
- **[web]** Layout con **sidebar** (`DashboardShell` + `app/dashboard/layout.tsx`): header con
  marca + toggle de tema + usuario/logout; sidebar con navegación (Cartera/Reportes/Equipo/Caja)
  estilo orus (uppercase, activo con borde sky + accent); nav horizontal en móvil.
- **[web]** Modo claro/oscuro con `next-themes` (navy en oscuro). Charts al azul de marca.
- **[verificación]** typecheck web OK; todas las páginas compilan (1986 módulos) y sirven 200.

## 2026-07-04 — Login split-screen estilo orus

- **[web]** Rediseño del login al patrón de orus: pantalla dividida (formulario ~46% / panel de
  marca ~54% oculto en móvil). Panel derecho con gradiente azul de marca, tagline, mock de
  cartera (ventana estilo navegador + mini-gráfica) y features (tiempo real / rutas / caja).
- **[verificación]** typecheck web OK; `/login` sirve 200 y renderiza marca + tagline + formulario.

## 2026-07-04 — Coherencia visual: app Expo con azul de marca

- **[app]** Reemplazados los colores verdes/slate por la paleta Altipal (azul `#004f9f`, navy
  `#0a2540`, fondo `#f4f7fb`, acento `#e6f3ff`) en login, ruta del día y header del stack.
  La app móvil ahora comparte identidad de marca con la web.
- **[verificación]** typecheck app OK (cambio solo de literales de color; bundle previo ya validado).

## 2026-07-04 — Menú ampliado + páginas Clientes/Productos/Notificaciones/Ajustes

- **[web]** Sidebar reorganizado en secciones (Operación / Análisis / Administración) con más
  ítems. Nuevas páginas:
  - **Clientes** (`/dashboard/clientes`): listado + crear cliente.
  - **Productos** (`/dashboard/productos`): tarjetas de productos + crear producto de crédito
    configurable (método, tasa, base, frecuencia, plazo, gracia, mora, redondeo).
  - **Notificaciones** (`/dashboard/notificaciones`): listado, marcar leída(s), realtime.
  - **Ajustes** (`/dashboard/ajustes`): perfil, organización, apariencia (tema), cerrar sesión.
- **[web]** GraphQL: `createClient`, `createCreditProduct`, `fetchNotifications`,
  `markNotificationRead`; campos extra en Client/Product.
- **[verificación]** typecheck web OK; 8 páginas del panel sirven 200; operaciones nuevas
  probadas contra el servidor (crear cliente/producto, notificaciones).

## 2026-07-04 — Menú completo de plataforma (19 secciones)

- **[backend]** `OpsModule` con feeds enriquecidos: `recentPayments`, `dueInstallments(TODAY/
  OVERDUE/UPCOMING)`, `cashMovements(type?)`, `reminders` (todos con `forTenant`/RLS).
- **[web]** Sidebar reorganizado en 6 secciones (Principal · Finanzas · Gestión · Comunicación ·
  Análisis · Cuenta). Páginas nuevas reales: **Inicio** (overview + accesos rápidos), **Préstamos**
  (cartera con búsqueda + filtro ruta), **Pagos** (feed), **Cobro del día** (tabs Hoy/Vencidas/
  Próximas), **Movimientos** y **Gastos** (movimientos de caja), **Rutas** (dedicada), **Equipo**
  (solo usuarios), **Recordatorios**, **Perfil**. Placeholders honestos: **Balances, Bases,
  Etiquetas, Chat** (`ComingSoon`).
- **[web]** Detalle de crédito y navegación apuntan a las nuevas rutas.
- **[verificación]** ops queries probadas contra el servidor; typecheck api+web OK; las 19
  secciones del panel sirven 200.

## 2026-07-04 — Fidelidad de estilo orus + doble sidebar + descripciones por módulo

- **[web]** Componentes calcados de orus-pos (base-nova): **Button** (compacto h-8, esquinas del
  token, `destructive` tenue, presión al click), **Card** (hairline `ring-1 ring-foreground/10`
  sin sombra pesada), **Dialog/popup** (borde 2px, overlay suave con blur).
- **[web]** **Doble sidebar** estilo orus: riel de secciones (iconos) + segundo sidebar con los
  ítems de la sección activa (cabecera con nombre de sección). Header 2px, mismos tokens/colores.
- **[web]** `PageHeader` con **texto explicativo en cada módulo** (qué es y para qué sirve):
  Inicio, Clientes, Préstamos, Pagos, Cobro del día, Movimientos, Gastos, Rutas, Equipo,
  Productos, Recordatorios, Notificaciones, Reportes, Perfil.
- **[verificación]** typecheck web OK; 19 secciones sirven 200; sin errores en dev.

## 2026-07-04 — Migración a Tailwind v4 + tema Duolingo + shadcn (selects/drawers)

- **[web/build]** Migrada la web de Tailwind v3 → **v4**: `@import "tailwindcss"` + `@theme inline`
  en `globals.css`, PostCSS `@tailwindcss/postcss`, `tw-animate-css`, sin `tailwind.config.ts`.
  Mismo motor que orus-pos.
- **[web/tema]** Tema **Duolingo** (`.pos-duo` de orus) como estilo global: verde `#58cc02`, fuente
  **Nunito**, radius 1rem, **botones 3D chunky**, cards/inputs borde 2px, badges píldora, foco azul,
  dark `#131f24`. CSS por `data-slot`.
- **[web/componentes]** **Select** de shadcn (Radix) reemplaza todos los `<select>` nativos
  (préstamos, crear crédito, productos, rutas, equipo). Nuevo **Sheet (drawer)**; formularios de
  creación (crédito, cliente, producto) ahora son **drawers**; abono/confirmaciones siguen **modales**.
- **[verificación]** typecheck web OK; páginas 200; CSS compilado contiene `--primary:#58cc02` y las
  utilidades v4 (`.bg-primary`) se generan.
- **[pendiente]** Swap literal de Radix → `@base-ui/react` (shadcn base-nova) si se exige identidad
  a nivel de librería (no solo visual).

## 2026-07-04 — Tablas con filtro/orden/paginación + inputs de moneda

- **[web]** `DataTable` reutilizable: buscador, ordenamiento por columna (click en cabecera) y
  paginación. Aplicado a **Clientes, Pagos, Préstamos, Movimientos y Gastos**.
- **[web]** `CurrencyInput`: formato de moneda con separador de miles ($ 1.250.000) y valor entero
  en pesos. Aplicado a montos de **crédito, abono y caja** (apertura/movimiento/conteo de cierre).
- **[web]** Selects nativos restantes de Caja (tipo de movimiento) migrados a Select de shadcn.
- **[verificación]** typecheck web OK; páginas de tablas sirven 200.

## 2026-07-04 — Subheader consistente en cada módulo

- **[web]** `PageHeader` (título + descripción a la izquierda, botones/acciones a la derecha)
  estandarizado en **todos** los módulos: Inicio, Clientes, Préstamos, Pagos, Cobro del día,
  Movimientos, Gastos, Caja, Rutas, Equipo, Productos, Recordatorios, Notificaciones, Reportes,
  Perfil y los placeholders (Balances/Bases/Etiquetas/Chat vía `ComingSoon`).
- **[verificación]** typecheck web OK; las 19 secciones sirven 200.

## 2026-07-04 — App móvil: tab bar + dashboard + topbar (avatar/totales)

- **[app]** Navegación con **tab bar inferior** (expo-router Tabs + `@react-navigation/bottom-tabs`,
  iconos `@expo/vector-icons`): **Inicio · Clientes · Alertas · Menú** (+ Perfil/Ajustes ocultos).
- **[app]** **TopBar**: avatar arriba-izq que abre menú (Perfil/Ajustes/Cerrar sesión); arriba-der
  **Recaudado hoy vs Por cobrar** (de `dashboardStats`, refresco por socket).
- **[app]** **Inicio = dashboard**: KPIs (cartera, recaudado hoy, activos, mora) + cartera con
  "Registrar abono" (offline-first). Nuevas pantallas: Clientes (buscador), Notificaciones
  (marcar leído + realtime), Menú, Perfil, Ajustes.
- **[app]** Datos: `fetchDashboardStats`, `fetchClients`, `fetchNotifications`, `markNotificationRead`.
- **[fix]** Quitado `GestureHandlerRootView` del layout (evita crash de worklets/reanimated en
  Expo Go SDK 57; la app no usa gestos).
- **[dev]** Expo se corre en `--no-dev` para esquivar la instrumentación de Console Ninja que
  crasheaba Hermes (`consoleCreateTask`). Fix definitivo: desactivar Console Ninja + recargar IDE.
- **[verificación]** typecheck app OK; corriendo en simulador iOS 18.5 (iPhone 16): tab bar,
  topbar con totales y dashboard renderizados con datos reales.

## 2026-07-04 — App móvil: tema Duolingo + modal de abono con moneda

- **[app]** Tema **Duolingo** (igual que la web): verde `#58cc02`, esquinas 16px, **botones 3D
  chunky** (base inferior + mayúsculas), bordes 2px en tarjetas/KPIs/inputs. Paleta central en
  `lib/theme.ts`; login, dashboard, clientes, notificaciones, menú, perfil y ajustes actualizados.
- **[app]** Reemplazado `Alert.prompt` por **`AbonoModal`**: bottom-sheet con saldo, **input de
  moneda formateado** (`$ 1.250.000`), montos rápidos (5k/10k/20k/50k/Total) y botón 3D. Mantiene
  el flujo offline-first (encola + sincroniza).
- **[verificación]** typecheck app OK; corriendo en simulador iOS con look Duolingo y datos reales.

<!-- Plantilla para próximas entradas:
## AAAA-MM-DD — Título
- **[tipo]** descripción   (tipo ∈ decisión/infra/db/backend/app/web/seguridad/pendiente/fix)
-->

## 2026-07-04 — Balances, Etiquetas y Chat
- **[db]** Nuevos modelos `Tag` (etiquetas por tenant, `@@unique([tenantId,name])`) y `Message`
  (chat interno del tenant). Migración `20260704174528_tags_messages` con ENABLE/FORCE RLS +
  policy `tenant_isolation` + grants a `app_user` (mismo patrón que la migración RLS base).
- **[backend]** `StatsModule.balances`: consolidado financiero (capital, total a cobrar, recaudado,
  saldo) + recaudo por cobrador (`payment.groupBy(collectorId)`).
- **[backend]** `TagsModule`: CRUD (`tags`, `createTag`/`updateTag`/`deleteTag`; mutaciones OWNER/ADMIN).
- **[backend]** `ChatModule`: `messages` (cursor `before`), `sendMessage` con fan-out realtime
  `message.created` vía `EventsGateway.emitToTenant`.
- **[web]** Páginas reales (reemplazan ComingSoon): Balances (KPIs + barras de avance y por cobrador),
  Etiquetas (grid + drawer crear/editar con paleta), Chat (burbujas + realtime socket.io).
- **[verificación]** E2E OK (login→crear tag→enviar mensaje→listar) y aislamiento RLS confirmado en DB
  (otro tenant = 0 filas; bypass = filas visibles). Typecheck backend y web sin errores.

## 2026-07-04 — Términos del crédito al originar (no en producto)
- **[db]** `Loan.productId` ahora es opcional (migración `loan_inline_terms`). Los términos
  (cuotas, interés, frecuencia, mora) se definen al crear el crédito y se congelan en `loan.terms`.
- **[backend]** `CreateLoanInput` acepta `termCount`, `interestRate` (fracción), `interestMethod`,
  `rateBasis`, `frequency`, `lateFeeType`, `lateFeeValue`. `productId` opcional (plantilla retrocompatible).
  `LoansService.createLoan` arma los términos del input (o del producto) y genera el plan con el motor.
- **[backend]** `Loan` expone `termCount`, `interestRate`, `interestMethod`, `frequency`, `lateFeeValue`
  desde el snapshot.
- **[app/web]** Formulario "Nuevo crédito" reescrito: monto, cantidad de cuotas + frecuencia,
  interés %, mora % → **resumen en vivo** (capital, interés % y monto, total con interés, valor de
  cuota, duración en días/semanas/meses/años).
- **[verificación]** E2E OK: crédito sin producto (500.000, 20 cuotas diarias, 20%, mora 2%) →
  interés 100.000, total 600.000, 20 cuotas de 30.000 (25.000 capital + 5.000 interés). Typecheck OK en services/app/web.

## 2026-07-04 — Nuevo crédito: preset + cálculo bidireccional
- **[backend]** `CreditProduct` expone `lateFeeType` y `lateFeeValue` (para prellenar mora desde un preset).
- **[app/web]** Formulario "Nuevo crédito": selector de **preset** (desde config/productos) que prellena
  interés % y mora %; el valor a prestar, cuotas y frecuencia se definen en la vista del crédito.
- **[app/web]** **Cálculo bidireccional**: N.º de cuotas ↔ valor de cuota. El último campo editado "manda":
  si defines cuotas → calcula el valor; si defines el valor → calcula el nº de cuotas (días/semanas/quincenas/meses).
- **[verificación]** E2E: total 600.000, valor cuota 30.000 → 20 cuotas semanales de 30.000. Typecheck OK en services/app/web.

## 2026-07-04 — Resumen Financiero (app)
- **[backend]** Query `financialSummary(from, to)` en StatsModule: actividad (nº abonos/créditos),
  distribución de ingresos cobrados (capital/interés/mora prorrateado por PaymentAllocation→cuota),
  medios de pago (groupBy Payment.method) y desembolsos del período. Default: hoy.
- **[app]** Pantalla `resumen-financiero` (estilo Duolingo) con Actividad del día, Distribución de
  ingresos (Total Cobrado), Medios de pago (Efectivo/Tarjeta/Transferencia/Oficina) y Flujo de caja
  (ganancia neta, préstamos realizados, dinero a entregar). CTA del tab Resumen apunta aquí.
- **[nota]** Cargos, descuentos, bases y gastos aún no están modelados → se muestran en $0 (pendiente).
- **[verificación]** E2E: 10 abonos, total cobrado 1.384.000 = capital 1.309.158 + interés 74.842; desembolsado 39.450.000. Typecheck OK.

## 2026-07-04 — Rediseño detalle de cliente y crédito (app)
- **[app]** `cliente/[id]` rediseñado: cabecera verde con avatar, tarjeta de identidad (nombre, documento,
  ciudad) con acciones, banner "Créditos activos (N)" y tarjetas de crédito ricas (monto, código, barra de
  progreso pagado, valor cuota / cuotas / interés, frecuencia + fecha).
- **[app]** `loan/[id]` rediseñado con cabecera (Valor/Interés/Tipo/Frecuencia + Ver info/Editar/Eliminar),
  pestañas **Plan de pago / Historial / Gestiones**, filtros (Pendientes/Pagadas/Vencidas/Todas),
  tarjetas de cuota (saldo capital/interés/total, vence, abonado), botón flotante Abonar, **modal de Info**
  completo (ID, fechas, cuotas vencidas/pagadas, deuda a capital, intereses pendientes, saldo total),
  Historial con tarjeta de Abonos (capital/interés/mora, balance, ganancia esperada) + lista de pagos,
  y menú "Más opciones" (Renovar/Marcar pagado/Editar fechas/Imprimir — stubs).
- **[app]** graphql: `Loan`/`LoanDetail`/`Installment` extendidos (code, termCount, interestRate, frequency,
  disbursedAt, firstDueDate, principalPart, interestPart).
- **[pendiente]** Gestiones (modelo backend + modal Nueva Gestión) y Editar/Eliminar/Renovar/Imprimir.
- **[verificación]** Typecheck app OK; queries nuevas verificadas contra backend en vivo.

## 2026-07-04 — Gestiones de cobranza (app + backend)
- **[db]** Modelo `CollectionManagement` (tipo CALL/VISIT/SMS/WHATSAPP/EMAIL/OTHER, resultado, nota,
  compromiso de pago [monto+fecha], seguimiento [fecha+nota]). Migración `collection_managements` con RLS.
- **[backend]** `ManagementsModule`: query `managements(loanId)` y mutation `createManagement`.
- **[app]** Pestaña **Gestiones** del crédito: lista de gestiones (con badges de tipo/resultado, promesa y
  seguimiento) + modal **Nueva gestión** (tipo, resultado, nota, compromiso de pago con monto/fecha,
  programar seguimiento). Botón flotante "Nueva gestión".
- **[verificación]** E2E: gestión "Llamada · Promesa de pago" con $50.000 creada y listada. RLS verificado
  (otro tenant = 0 filas). Typecheck OK en services/app.

## 2026-07-04 — Estilo Duolingo en detalles + código de crédito
- **[backend]** `createLoan` autogenera `code` legible (YYMMDD-XXX).
- **[app]** `cliente/[id]` rediseñado 100% estilo Duolingo: hero verde brillante (#58cc02) con avatar,
  acciones rápidas chunky, sección "Créditos activos" con pill de conteo, tarjetas de crédito con borde
  3D, barra de progreso verde, chips de frecuencia.
- **[app]** `loan/[id]` rediseñado estilo Duolingo: hero verde con monto/código/progreso + mini-stats,
  acciones flotando sobre el hero, tabs chunky (verde activo), filtros de cuotas, tarjetas de cuota 3D,
  botón Abonar/Nueva gestión flotante 3D, tarjeta de Abonos verde, modal de info e info-menú redondeados.
  Se eliminó el verde salvia del competidor; ahora todo usa el tema Duolingo.
- **[verificación]** Typecheck app/services OK; código de crédito verificado (260704-FG9).

## 2026-07-04 — Pulido Duolingo en toda la app
- **[app]** Pase de estilo consistente: tarjetas "chunky 3D" (borde inferior grueso) en Home, Clientes,
  Cobro del día, Notificaciones, Balances, Resumen, Resumen Financiero, Ajustes y Perfil.
- **[app]** Héroes/CTA unificados al verde Duolingo (#58cc02): hero de Balances y CTA de Resumen pasan de
  azul a verde. Pestañas de Cobro del día verdes. Avatares de Clientes en verde.
- **[app]** Barra de pestañas inferior más marcada (borde superior 2px, altura, activo verde).
- **[app]** Modal Nueva Gestión migrado de verde salvia a verde Duolingo. Eliminadas todas las referencias
  al verde salvia del competidor.

## 2026-07-04 — Gastos (expenses)
- **[db]** Modelo `Expense` (categoría, monto, nota, autor) con migración + RLS multi-tenant.
- **[backend]** `ExpensesModule`: query `expenses(from,to)` + mutation `createExpense`. `financialSummary`
  ahora agrega `expensesTotal` y `netProfit` = (interés + mora cobrados) − gastos.
- **[app]** Pantalla **Gastos** (hero verde con total, lista con categorías de color, modal Nuevo gasto con
  chips de categoría + monto + nota). Acceso desde Ajustes → Operación.
- **[app]** Resumen Financiero muestra la línea **Gastos** real y la **Ganancia neta** ya descuenta gastos.
- **[verificación]** E2E: gasto Transporte $25.000 → netProfit $162.885 (interés $187.885 − $25.000). RLS OK
  (otro tenant = 0). Typecheck services/app OK.

## 2026-07-04 — Navegación stack, permisos, ajustes y Home
- **[backend]** `createLoan` ahora permite COLLECTOR (el cobrador crea préstamos en campo). Corrige
  "No tienes permisos para esta operación".
- **[app]** Reestructura de navegación: tabs movidas a grupo `(tabs)`; el layout de `(app)` pasa a **Stack**
  (headerShown:false) para que los detalles se apilen y el botón "atrás" vuelva a la vista anterior
  (antes volvía siempre al Home). `backBehavior="history"` en las tabs.
- **[app]** Menú del avatar: **Mi perfil / Cerrar operación / Cerrar sesión** (se quitó "Ajustes").
  Nueva pantalla **Cerrar operación** (cierre del día con resumen: recaudado, gastos, ganancia neta).
- **[app]** Pestaña **Ajustes** convertida en **configuración global** (interés/mora, productos, empresa,
  moneda, formato, idioma, usuarios, rutas, operación) — ya no es ajuste del usuario.
- **[app]** **Perfil** con botón "Editar perfil".
- **[app]** Header: totales sobre chip translúcido para mejor contraste sobre el verde.
- **[app]** **Home refactorizado**: saludo + KPIs (con íconos de color) + acciones rápidas
  (Cliente/Cobro/Gasto) + **Cobros de hoy** (cuotas del día) en vez de la lista de toda la cartera.
- **[verificación]** Cobrador crea préstamo OK (260704-BOI). Typecheck app/services OK.
