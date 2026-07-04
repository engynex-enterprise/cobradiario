import Decimal from 'decimal.js';
import type { RoundingMode } from './types';

// Precisión alta para cálculos intermedios; el redondeo a moneda se hace explícito.
Decimal.set({ precision: 40 });

export { Decimal };

export const D = (v: Decimal.Value): Decimal => new Decimal(v);

/** Redondea a 2 decimales (centavos) con medio-arriba. */
export function toMoney(v: Decimal.Value): number {
  return new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Redondea el valor de una cuota según la política del producto.
 * `roundTo` = múltiplo objetivo (ej. 100 → redondea a centenas). Si es 0/undefined,
 * se redondea a centavos.
 */
export function roundInstallment(
  value: Decimal.Value,
  mode: RoundingMode = 'NEAREST',
  roundTo = 0,
): number {
  const v = new Decimal(value);
  if (mode === 'NONE' || !roundTo || roundTo <= 0) {
    return toMoney(v);
  }
  const step = new Decimal(roundTo);
  const q = v.div(step);
  let rounded: Decimal;
  switch (mode) {
    case 'UP':
      rounded = q.ceil();
      break;
    case 'DOWN':
      rounded = q.floor();
      break;
    case 'NEAREST':
    default:
      rounded = q.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      break;
  }
  return toMoney(rounded.mul(step));
}
