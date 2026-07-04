# @cobradiario/credit-engine

Motor de crédito **puro** (sin DB ni framework) para cobro diario. Todo el dinero se maneja
con `decimal.js` — nunca `float`. Testeable en aislamiento (23 pruebas con `node:test`).

## API

```ts
import { generateSchedule, allocatePayment, calcLateFee } from '@cobradiario/credit-engine';

// 1) Plan de cuotas (gota a gota clásico: 100k @ 20% en 20 cuotas diarias)
const schedule = generateSchedule({
  principal: 100_000,
  firstDueDate: new Date('2026-01-01'),
  terms: {
    interestMethod: 'FLAT',        // | 'DECLINING_BALANCE' | 'CUSTOM'
    interestRate: 0.2,
    rateBasis: 'PER_LOAN',         // | 'PER_PERIOD' | 'ANNUAL'
    frequency: 'DAILY',            // | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'
    termCount: 20,
    roundingMode: 'NEAREST',       // redondeo configurable...
    roundTo: 100,                  // ...a múltiplos de 100
  },
});
// → { principal, interestTotal, totalDue, installments: [{ sequence, dueDate, amount, principalPart, interestPart }] }

// 2) Registrar un abono (FIFO: mora primero, cuota más antigua primero)
const result = allocatePayment(installments, 15_000);
// → { allocations, applied, leftover, updated }

// 3) Mora de una cuota vencida
const fee = calcLateFee(terms, { amount: 6000, dueDate, balance: 6000 }, new Date());
```

## Extensión CUSTOM

Para métodos de interés a medida, registra una estrategia:

```ts
generateSchedule(input, {
  miMetodo: (input) => ({ /* Schedule */ }),
});
// requiere terms.interestMethod = 'CUSTOM' y terms.config.strategy = 'miMetodo'
```

## Comandos

```bash
pnpm --filter @cobradiario/credit-engine test    # node:test
pnpm --filter @cobradiario/credit-engine build   # tsc → dist/
```

Se integrará en los módulos de dominio del backend (loans/payments) dentro de transacciones DB.
Ver `context/02-domain-model.md` (reglas del motor) y `context/01-architecture.md` §4.1.
