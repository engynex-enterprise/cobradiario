# Modelo de dominio

> Fuente de verdad del schema: `services/prisma/schema.prisma`. Este documento explica el
> *porqué* y las reglas de negocio que el schema codifica.

## Glosario (cobro diario)
- **Tenant:** cuenta en la plataforma. Empresa o persona prestamista.
- **Cobrador (collector):** usuario que sale a cobrar en una ruta.
- **Ruta (route):** conjunto ordenado de clientes/créditos que un cobrador visita.
- **Cliente/Deudor:** persona a quien se le presta.
- **Producto de crédito:** plantilla configurable (interés, plazo, frecuencia, mora).
- **Crédito/Préstamo (loan):** dinero entregado a un cliente bajo un producto.
- **Cuota (installment):** pago programado dentro del plan del crédito.
- **Abono/Pago (payment):** dinero efectivamente recibido; se asigna a cuotas.
- **Caja/Arqueo (cash box):** control de efectivo del cobrador por jornada.

## Entidades y relaciones (resumen)
```
Tenant 1─┬─* User ──* Membership(role)          # OWNER/ADMIN/MANAGER/COLLECTOR/VIEWER
         ├─* Route 1─* Loan
         ├─* Client 1─* Loan
         ├─* CreditProduct 1─* Loan
         ├─* CashBox 1─* CashMovement
         ├─* Notification / DeviceToken / Reminder
         └─* AuditLog / LedgerEntry

Loan 1─* Installment 1─* PaymentAllocation *─1 Payment
User(collector) *─* Route (asignación)
```

## Reglas del motor de crédito (configurable)
`CreditProduct` congela sus parámetros en el `Loan` al originarse (snapshot), para que cambiar
un producto **no** altere créditos ya emitidos.

### Métodos de interés (`InterestMethod`)
- **FLAT (fijo / "gota a gota"):** `interesTotal = principal * rate`. `totalAPagar = principal + interesTotal`.
  Cuota = `totalAPagar / nCuotas` (con política de redondeo). Es el 90% del cobro diario en LatAm.
- **DECLINING_BALANCE (saldo decreciente / amortización):** interés se calcula sobre saldo insoluto
  por período; cuota fija estilo francés o interés+capital variable.
- **CUSTOM:** parámetros en `config` (JSON) + estrategia registrada en el motor. Permite
  "configurar absolutamente todo" sin migración de schema para cada variante.

### Parámetros configurables por producto
| Campo | Descripción |
|---|---|
| `interestMethod` | FLAT / DECLINING_BALANCE / CUSTOM |
| `interestRate` | tasa (interpretada según método y `rateBasis`) |
| `rateBasis` | PER_LOAN / PER_PERIOD / ANNUAL |
| `frequency` | DAILY / WEEKLY / BIWEEKLY / MONTHLY / CUSTOM |
| `termCount` | número de cuotas |
| `graceDays` | días de gracia antes de mora |
| `lateFeeType` | NONE / FIXED / PERCENT_OF_INSTALLMENT / PERCENT_OF_BALANCE / DAILY_PERCENT |
| `lateFeeValue` | valor asociado al tipo de mora |
| `rounding` | NONE / UP / DOWN / NEAREST + `roundTo` (p.ej. redondear a 100) |
| `minPrincipal`/`maxPrincipal` | límites de monto |
| `config` (JSON) | extensión libre para variantes CUSTOM |

## Reglas invariantes (se validan en dominio, no solo en UI)
1. **Dinero con `Decimal(18,2)`** en toda columna monetaria. Prohibido `float`.
2. Un `Payment` no puede exceder el saldo del crédito (salvo `allowOverpayment` del tenant).
3. Asignación de pagos **FIFO**: primero mora, luego cuota más antigua vencida, luego corriente.
4. Estados de `Installment`: `PENDING → PARTIAL → PAID`, o `→ OVERDUE` al pasar `dueDate + graceDays`.
5. Estados de `Loan`: `PENDING_APPROVAL → ACTIVE → (PAID | DEFAULTED | RENEWED | CANCELLED)`.
6. Toda operación monetaria escribe un `LedgerEntry` **inmutable** (append-only) para auditoría.
7. `AuditLog` registra actor, acción, entidad y diff en operaciones sensibles.
8. Soft-delete (`deletedAt`) en entidades de negocio; nunca borrado físico de datos financieros.

## Enums (ver schema para la lista canónica)
`TenantType, TenantStatus, UserRole, MembershipStatus, LoanStatus, InstallmentStatus,
PaymentMethod, PaymentStatus, InterestMethod, RateBasis, Frequency, LateFeeType, RoundingMode,
CashMovementType, NotificationType, NotificationChannel, ReminderStatus, LedgerEntryType`.

## Índices clave (rendimiento a escala)
- `Loan (tenantId, routeId, status)` — listar cartera de una ruta.
- `Installment (tenantId, loanId, dueDate)` y `(tenantId, status, dueDate)` — cobros del día / mora.
- `Payment (tenantId, createdAt)` — cierres y reportes; candidato a particionar por fecha.
- Único `Payment (tenantId, clientRequestId)` — idempotencia offline.
- `Client (tenantId, documentId)` — evita duplicados de cédula por tenant.
