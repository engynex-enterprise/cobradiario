import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocatePayment } from '../src/allocation';
import type { AllocatableInstallment } from '../src/types';

function makeInstallments(): AllocatableInstallment[] {
  // Tres cuotas de 6.000, la primera con 500 de mora.
  return [
    { id: 'c1', sequence: 1, dueDate: new Date('2026-01-01T00:00:00Z'), amount: 6000, lateFee: 500 },
    { id: 'c2', sequence: 2, dueDate: new Date('2026-01-02T00:00:00Z'), amount: 6000 },
    { id: 'c3', sequence: 3, dueDate: new Date('2026-01-03T00:00:00Z'), amount: 6000 },
  ];
}

test('pago exacto de la primera cuota (incluye mora) la deja PAID', () => {
  const r = allocatePayment(makeInstallments(), 6500);
  assert.equal(r.applied, 6500);
  assert.equal(r.leftover, 0);
  assert.equal(r.allocations.length, 1);
  assert.equal(r.allocations[0]!.installmentId, 'c1');
  assert.equal(r.updated[0]!.status, 'PAID');
});

test('pago parcial deja la cuota en PARTIAL', () => {
  const r = allocatePayment(makeInstallments(), 3000);
  assert.equal(r.allocations.length, 1);
  assert.equal(r.updated[0]!.status, 'PARTIAL');
  assert.equal(r.updated[0]!.paidAmount, 3000);
  assert.equal(r.leftover, 0);
});

test('FIFO: un pago grande cubre varias cuotas en orden', () => {
  const r = allocatePayment(makeInstallments(), 15000);
  // 6500 (c1) + 6000 (c2) = 12500; quedan 2500 para c3 (parcial).
  assert.deepEqual(
    r.allocations.map((a) => [a.sequence, a.amount]),
    [
      [1, 6500],
      [2, 6000],
      [3, 2500],
    ],
  );
  assert.equal(r.updated[0]!.status, 'PAID');
  assert.equal(r.updated[1]!.status, 'PAID');
  assert.equal(r.updated[2]!.status, 'PARTIAL');
  assert.equal(r.leftover, 0);
});

test('sobrepago: el excedente queda como leftover (saldo a favor)', () => {
  const r = allocatePayment(makeInstallments(), 20000);
  // total adeudado = 6500 + 6000 + 6000 = 18500
  assert.equal(r.applied, 18500);
  assert.equal(r.leftover, 1500);
  assert.ok(r.updated.every((u) => u.status === 'PAID'));
});

test('respeta paidAmount previo (no recobra lo ya pagado)', () => {
  const insts = makeInstallments();
  insts[0]!.paidAmount = 6500; // c1 ya saldada
  const r = allocatePayment(insts, 6000);
  // Debe saltar c1 y aplicar todo a c2.
  assert.equal(r.allocations.length, 1);
  assert.equal(r.allocations[0]!.sequence, 2);
  assert.equal(r.updated[0]!.status, 'PAID');
});

test('orden FIFO por fecha aunque la entrada venga desordenada', () => {
  const insts = makeInstallments().reverse(); // c3, c2, c1
  const r = allocatePayment(insts, 6500);
  assert.equal(r.allocations[0]!.sequence, 1); // la más antigua primero
});

test('monto de pago inválido lanza', () => {
  assert.throws(() => allocatePayment(makeInstallments(), 0), /positivo/);
  assert.throws(() => allocatePayment(makeInstallments(), -100), /positivo/);
});
