import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedule } from '../src/schedule';
import type { CreditTerms, ScheduleInput } from '../src/types';

const firstDueDate = new Date('2026-01-01T00:00:00Z');

function baseTerms(over: Partial<CreditTerms> = {}): CreditTerms {
  return {
    interestMethod: 'FLAT',
    interestRate: 0.2,
    rateBasis: 'PER_LOAN',
    frequency: 'DAILY',
    termCount: 20,
    roundingMode: 'NEAREST',
    roundTo: 0,
    ...over,
  };
}

function sum(nums: number[]): number {
  return Math.round(nums.reduce((s, n) => s + n, 0) * 100) / 100;
}

test('FLAT clásico: 100.000 @ 20% / 20 cuotas diarias = 20 cuotas de 6.000', () => {
  const input: ScheduleInput = { principal: 100_000, firstDueDate, terms: baseTerms() };
  const s = generateSchedule(input);

  assert.equal(s.interestTotal, 20_000);
  assert.equal(s.totalDue, 120_000);
  assert.equal(s.installments.length, 20);
  for (const it of s.installments) {
    assert.equal(it.amount, 6_000);
    // amount siempre = capital + interés
    assert.equal(Math.round((it.principalPart + it.interestPart) * 100) / 100, it.amount);
  }
  // La suma de cuotas cuadra EXACTO con el total.
  assert.equal(sum(s.installments.map((i) => i.amount)), 120_000);
});

test('FLAT con redondeo a centenas: la suma sigue cuadrando exacto (última cuota ajusta)', () => {
  const input: ScheduleInput = {
    principal: 97_333,
    firstDueDate,
    terms: baseTerms({ interestRate: 0.15, roundTo: 100 }),
  };
  const s = generateSchedule(input);

  // totalDue = 97333 * 1.15 = 111932.95
  assert.equal(s.totalDue, 111_932.95);
  // Las 19 primeras cuotas son múltiplos de 100; la última absorbe el remanente.
  for (let i = 0; i < 19; i++) {
    assert.equal(s.installments[i]!.amount % 100, 0);
  }
  assert.equal(sum(s.installments.map((i) => i.amount)), 111_932.95);
});

test('FLAT PER_PERIOD: interés escala con el número de cuotas', () => {
  const input: ScheduleInput = {
    principal: 100_000,
    firstDueDate,
    terms: baseTerms({ rateBasis: 'PER_PERIOD', interestRate: 0.01, termCount: 10 }),
  };
  const s = generateSchedule(input);
  // interés = 100000 * 0.01 * 10 = 10000
  assert.equal(s.interestTotal, 10_000);
  assert.equal(s.totalDue, 110_000);
});

test('DECLINING_BALANCE: el saldo se liquida exacto y capital suma el principal', () => {
  const input: ScheduleInput = {
    principal: 100_000,
    firstDueDate,
    terms: baseTerms({
      interestMethod: 'DECLINING_BALANCE',
      rateBasis: 'PER_PERIOD',
      interestRate: 0.02,
      termCount: 12,
      roundTo: 0,
    }),
  };
  const s = generateSchedule(input);

  assert.equal(s.installments.length, 12);
  // La suma de capital debe reconstruir el principal (última cuota liquida el saldo).
  assert.equal(sum(s.installments.map((i) => i.principalPart)), 100_000);
  // totalDue = principal + interés
  assert.equal(
    Math.round((s.principal + s.interestTotal) * 100) / 100,
    s.totalDue,
  );
  // El interés total es positivo y menor en un declining vs flat equivalente.
  assert.ok(s.interestTotal > 0);
});

test('DECLINING_BALANCE con tasa 0: cuotas de capital iguales', () => {
  const input: ScheduleInput = {
    principal: 120_000,
    firstDueDate,
    terms: baseTerms({
      interestMethod: 'DECLINING_BALANCE',
      rateBasis: 'PER_PERIOD',
      interestRate: 0,
      termCount: 12,
    }),
  };
  const s = generateSchedule(input);
  assert.equal(s.interestTotal, 0);
  assert.equal(s.totalDue, 120_000);
  for (const it of s.installments) {
    assert.equal(it.amount, 10_000);
    assert.equal(it.interestPart, 0);
  }
});

test('fechas de vencimiento: diarias incrementan un día', () => {
  const s = generateSchedule({ principal: 100_000, firstDueDate, terms: baseTerms({ termCount: 3 }) });
  assert.equal(s.installments[0]!.dueDate.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(s.installments[1]!.dueDate.toISOString(), '2026-01-02T00:00:00.000Z');
  assert.equal(s.installments[2]!.dueDate.toISOString(), '2026-01-03T00:00:00.000Z');
});

test('CUSTOM sin estrategia registrada lanza error claro', () => {
  const input: ScheduleInput = {
    principal: 100_000,
    firstDueDate,
    terms: baseTerms({ interestMethod: 'CUSTOM', config: { strategy: 'foo' } }),
  };
  assert.throws(() => generateSchedule(input), /CUSTOM requiere una estrategia/);
});

test('CUSTOM con estrategia registrada la invoca', () => {
  const input: ScheduleInput = {
    principal: 50_000,
    firstDueDate,
    terms: baseTerms({ interestMethod: 'CUSTOM', config: { strategy: 'flat0' } }),
  };
  const s = generateSchedule(input, {
    flat0: (i) => ({
      principal: i.principal,
      interestTotal: 0,
      totalDue: i.principal,
      installments: [],
    }),
  });
  assert.equal(s.totalDue, 50_000);
  assert.equal(s.interestTotal, 0);
});

test('validaciones: principal y termCount inválidos lanzan', () => {
  assert.throws(() => generateSchedule({ principal: 0, firstDueDate, terms: baseTerms() }), /principal/);
  assert.throws(
    () => generateSchedule({ principal: 1000, firstDueDate, terms: baseTerms({ termCount: 0 }) }),
    /termCount/,
  );
});
