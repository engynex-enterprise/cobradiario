import type { Frequency } from './types';

const DEFAULT_PERIODS_PER_YEAR: Record<Frequency, number> = {
  DAILY: 365,
  WEEKLY: 52,
  BIWEEKLY: 26,
  MONTHLY: 12,
  CUSTOM: 365,
};

export function periodsPerYear(frequency: Frequency, override?: number): number {
  return override && override > 0 ? override : DEFAULT_PERIODS_PER_YEAR[frequency];
}

const isSkip = (d: Date, skip: number[]) => skip.includes(d.getUTCDay());
function advanceToPayable(d: Date, skip: number[]): Date {
  let guard = 0;
  while (isSkip(d, skip) && guard++ < 14) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Devuelve la fecha de vencimiento de la cuota `index` (0-based) a partir de la primera.
 * `nonPayDays` (0=dom … 6=sáb) permite excluir días de cobro:
 *  - DAILY: cuenta solo días hábiles (salta los excluidos).
 *  - Otras frecuencias: si el resultado cae en un día excluido, avanza al siguiente hábil.
 */
export function dueDateFor(
  firstDueDate: Date,
  index: number,
  frequency: Frequency,
  customIntervalDays = 1,
  nonPayDays: number[] = [],
): Date {
  const skip = nonPayDays.filter((x) => x >= 0 && x <= 6);
  const skipActive = skip.length > 0 && skip.length < 7;

  if (frequency === 'DAILY' && skipActive) {
    const d = advanceToPayable(new Date(firstDueDate.getTime()), skip);
    let count = 0;
    let guard = 0;
    while (count < index && guard++ < index * 14 + 14) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (!isSkip(d, skip)) count++;
    }
    return d;
  }

  const d = new Date(firstDueDate.getTime());
  switch (frequency) {
    case 'DAILY':
      d.setUTCDate(d.getUTCDate() + index);
      break;
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + index * 7);
      break;
    case 'BIWEEKLY':
      d.setUTCDate(d.getUTCDate() + index * 14);
      break;
    case 'MONTHLY':
      d.setUTCMonth(d.getUTCMonth() + index);
      break;
    case 'CUSTOM':
      d.setUTCDate(d.getUTCDate() + index * Math.max(1, customIntervalDays));
      break;
  }
  if (skipActive) advanceToPayable(d, skip);
  return d;
}

/** Número de días de atraso entre dueDate y una fecha de referencia (0 si no hay atraso). */
export function daysOverdue(dueDate: Date, asOf: Date): number {
  const ms = asOf.getTime() - dueDate.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
