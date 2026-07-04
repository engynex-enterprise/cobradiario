# Arquitectura

## 1. Estilo arquitectónico
**Monolito modular** en el backend (NestJS) con límites de módulo estrictos por *bounded context*,
desplegable como un solo servicio hoy y **extraíble a microservicios** cuando un contexto lo exija
(el módulo de notificaciones/colas es el primer candidato natural a separarse).

Motivación: a escala de arranque, un monolito modular bien acotado da la velocidad de un monolito
y la disciplina de límites que permite dividir después sin reescribir. Evita el "microservicio
prematuro" (latencia de red, sagas, consistencia distribuida) antes de tener carga que lo justifique.

### Capas dentro de cada módulo (Clean Architecture pragmática)
```
module/
├─ *.resolver.ts        # Capa de entrega (GraphQL). Sin lógica de negocio.
├─ *.gateway.ts         # Entrega realtime (Socket.IO) cuando aplica.
├─ dto/                 # Inputs/Args + Object Types (GraphQL)
├─ *.service.ts         # Casos de uso / lógica de aplicación
├─ domain/              # Entidades, value objects, reglas puras (sin IO)
└─ *.repository.ts      # Acceso a datos (Prisma). Aísla el ORM.
```
Regla de dependencia: `resolver → service → domain`; `service → repository`. El dominio no importa
Prisma ni Nest. Esto mantiene el **motor de crédito** testeable en aislamiento y reemplazable.

## 2. Diagrama lógico
```
┌───────────────┐     ┌───────────────┐
│  App Expo     │     │  Web Next.js  │
│ (cobradores)  │     │ (admin)       │
└──────┬────────┘     └──────┬────────┘
       │ GraphQL (HTTP)      │ GraphQL (HTTP)
       │ + WS (Socket.IO)    │ + WS
       ▼                     ▼
┌─────────────────────────────────────────────┐
│              API Gateway (NestJS)            │
│  Auth/RBAC · Tenant context · Rate limit     │
│  ┌────────┬────────┬────────┬─────────────┐  │
│  │ Auth   │ Loans  │Payments│ Notifications│  │
│  │ Users  │ Clients│ Routes │ Realtime GW  │  │
│  │ Tenants│ Credit │ CashBox│ (Socket.IO)  │  │
│  └────────┴────────┴────────┴─────────────┘  │
└───────┬───────────────────┬──────────┬───────┘
        │                   │          │
        ▼                   ▼          ▼
  ┌───────────┐      ┌──────────┐  ┌────────┐
  │PostgreSQL │      │  Redis   │  │ BullMQ │
  │  (Prisma) │      │ PubSub / │  │ (jobs: │
  │           │      │ cache /  │  │ mora,  │
  │           │      │ WS adapt.│  │ recor- │
  └───────────┘      └──────────┘  │ datorios)
                                    └────────┘
```

## 3. Multi-tenancy
- Modelo **shared-database, shared-schema** con columna `tenantId` en toda entidad de negocio.
- **Aislamiento en dos capas:**
  1. **App layer (obligatorio):** una `Prisma Client Extension` inyecta `tenantId` en cada
     query/insert a partir del contexto de la petición (resuelto del JWT). Ningún resolver
     confía en un `tenantId` que venga del cliente.
  2. **DB layer (defensa en profundidad, recomendado prod):** Row-Level Security en Postgres
     con políticas `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. La sesión fija
     `SET app.tenant_id` por request. Evita fugas incluso ante un bug en la capa app.
- `Tenant.type ∈ {ORGANIZATION, INDIVIDUAL}`: un individuo es un tenant con 1 solo usuario OWNER
  que también actúa como cobrador. No hay ramas de código especiales; solo límites de plan.

## 4. Flujos críticos
### 4.1 Registro de un abono (pago) — camino caliente
1. Cobrador (app) emite `mutation registerPayment` con `loanId`, monto, geo, método.
2. Guard valida JWT → resuelve `tenantId` + `userId` + rol.
3. `PaymentsService` abre **transacción**: bloquea el `Loan` (`SELECT … FOR UPDATE`),
   asigna el pago a cuotas pendientes (FIFO), recalcula saldos y estados, escribe
   `Payment` + `PaymentAllocation` + `LedgerEntry` (log financiero inmutable).
4. Se emite evento de dominio → Socket.IO (`payment.registered`) a la sala del tenant/ruta
   y GraphQL Subscription → dashboards se actualizan en vivo.
5. Se encola job (BullMQ) para recibo/notificación al cliente.
> Idempotencia: la mutación acepta `clientRequestId` único para tolerar reintentos offline
> de la app sin doble cobro.

### 4.2 Sincronización offline (app en ruta, sin señal)
La app encola mutaciones localmente (WatermelonDB/AsyncStorage) y las reenvía al recuperar
señal usando `clientRequestId` idempotente. El servidor es la fuente de verdad; ante conflicto
gana el estado del servidor y se notifica al cobrador.

## 5. Cuellos de botella y riesgos de escalabilidad (causa raíz → mitigación)
| Riesgo | Causa raíz | Mitigación |
|---|---|---|
| Contención en `Loan` en horas pico de cobro | bloqueo por fila + muchos abonos concurrentes al mismo crédito (raro) o a la misma ruta | bloqueo por *fila* (no tabla), transacciones cortas, índices en `(tenantId, routeId, status)` |
| N+1 en GraphQL (listar créditos con cuotas) | resolvers anidados sin batching | **DataLoader** por request + `select`/`include` explícitos en Prisma |
| Agotamiento del pool de conexiones a escala | serverless/muchas instancias abren muchas conexiones | **PgBouncer** (o pooler del proveedor) + `DATABASE_URL` con `connection_limit`; `DIRECT_URL` para migraciones |
| Recalcular mora de todos los créditos a diario | job masivo diario | job **particionado por tenant/ruta** en BullMQ, ejecutado en ventana nocturna, idempotente |
| Fan-out de realtime a miles de clientes WS | un solo proceso no escala WS horizontalmente | **Redis adapter** de Socket.IO → múltiples instancias comparten salas |
| Reportes pesados bloqueando OLTP | agregaciones sobre tablas transaccionales | vistas materializadas / réplica de lectura; a futuro, tabla de agregados por día |
| Crecimiento ilimitado de `Payment`/`LedgerEntry` | tablas append-only enormes | particionado por rango de fecha (`PARTITION BY RANGE`) y archivado en frío |

## 6. Deuda técnica aceptada (consciente, con plan)
- **RLS aún no activado** en la migración inicial: se implementa el aislamiento en capa app
  primero; RLS se añade en migración dedicada antes de producción (issue en CHANGELOG).
- **Módulos de dominio (loans/payments/clients) están scaffolded**, no implementados por completo
  en esta entrega de Fundación. Contratos GraphQL y servicios base definidos; lógica del motor
  de crédito y allocation se implementa en la siguiente iteración.
