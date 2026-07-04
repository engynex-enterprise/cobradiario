import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcLateFee } from '../src/late-fee';
import { roundInstallment } from '../src/money';
import type { CreditTerms } from '../src/types';

const due = new Date('2026-01-01T00:00:00Z');
const asOf5 = new Date('2026-01-06T00:00:00Z'); // 5 días después

function terms(over: Partial<CreditTerms>): CreditTerms {
  return {
    interestMethod: 'FLAT',
    interestRate: 0.2,
    rateBasis: 'PER_LOAN',
    frequency: 'DAILY',
    termCount: 20,
    ...over,
  };
}

test('NONE no genera mora', () => {
  assert.equal(calcLateFee(terms({ lateFeeType: 'NONE' }), { amount: 6000, dueDate: due }, asOf5), 0);
});

test('FIXED aplica valor fijo tras vencer', () => {
  const t = terms({ lateFeeType: 'FIXED', lateFeeValue: 1000 });
  assert.equal(calcLateFee(t, { amount: 6000, dueDate: due }, asOf5), 1000);
});

test('días de gracia evitan la mora', () => {
  const t = terms({ lateFeeType: 'FIXED', lateFeeValue: 1000, graceDays: 10 });
  assert.equal(calcLateFee(t, { amount: 6000, dueDate: due }, asOf5), 0);
});

test('PERCENT_OF_INSTALLMENT', () => {
  const t = terms({ lateFeeType: 'PERCENT_OF_INSTALLMENT', lateFeeValue: 0.05 });
  assert.equal(calcLateFee(t, { amount: 6000, dueDate: due }, asOf5), 300);
});

test('DAILY_PERCENT acumula por días efectivos de atraso', () => {
  const t = terms({ lateFeeType: 'DAILY_PERCENT', lateFeeValue: 0.01, graceDays: 1 });
  // saldo 6000 * 1% * (5 - 1 gracia) = 240
  assert.equal(calcLateFee(t, { amount: 6000, balance: 6000, dueDate: due }, asOf5), 240);
});

test('no hay mora antes del vencimiento', () => {
  const t = terms({ lateFeeType: 'FIXED', lateFeeValue: 1000 });
  assert.equal(calcLateFee(t, { amount: 6000, dueDate: due }, due), 0);
});

test('roundInstallment: modos de redondeo a múltiplos', () => {
  assert.equal(roundInstallment(6049, 'NEAREST', 100), 6000);
  assert.equal(roundInstallment(6050, 'NEAREST', 100), 6100);
  assert.equal(roundInstallment(6001, 'UP', 100), 6100);
  assert.equal(roundInstallment(6099, 'DOWN', 100), 6000);
  assert.equal(roundInstallment(6049.5, 'NONE', 0), 6049.5);
});
