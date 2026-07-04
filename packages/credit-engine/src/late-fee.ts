import { D, toMoney } from './money';
import { daysOverdue } from './dates';
import type { CreditTerms } from './types';

/**
 * Calcula la mora de UNA cuota vencida a una fecha de referencia, según la config del producto.
 * Respeta los días de gracia. Devuelve 0 si no aplica mora.
 */
export function calcLateFee(
  terms: CreditTerms,
  installment: { amount: number; balance?: number; dueDate: Date },
  asOf: Date,
): number {
  const type = terms.lateFeeType ?? 'NONE';
  if (type === 'NONE') return 0;

  const overdue = daysOverdue(installment.dueDate, asOf);
  const effectiveDays = overdue - (terms.graceDays ?? 0);
  if (effectiveDays <= 0) return 0;

  const value = D(terms.lateFeeValue ?? 0);
  const amount = D(installment.amount);
  const balance = D(installment.balance ?? installment.amount);

  switch (type) {
    case 'FIXED':
      return toMoney(value);
    case 'PERCENT_OF_INSTALLMENT':
      return toMoney(amount.mul(value));
    case 'PERCENT_OF_BALANCE':
      return toMoney(balance.mul(value));
    case 'DAILY_PERCENT':
      // value = % diario sobre el saldo, acumulado por días efectivos de atraso.
      return toMoney(balance.mul(value).mul(effectiveDays));
    default:
      return 0;
  }
}
