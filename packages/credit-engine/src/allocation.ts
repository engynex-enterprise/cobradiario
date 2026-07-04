import { D, Decimal, toMoney } from './money';
import type { AllocatableInstallment, AllocationResult } from './types';

/**
 * Asigna un pago a las cuotas de un crédito en orden FIFO (cuota más antigua primero).
 * Dentro de cada cuota, primero se cubre la mora y luego el valor base.
 * El sobrante (leftover) queda disponible como saldo a favor / abono a capital.
 *
 * Función PURA: no muta la entrada. Todo el dinero se maneja con Decimal.
 */
export function allocatePayment(
  installments: AllocatableInstallment[],
  paymentAmount: number,
): AllocationResult {
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('El monto del pago debe ser positivo');
  }

  // Orden FIFO estable: por fecha de vencimiento, luego por secuencia.
  const ordered = [...installments].sort((a, b) => {
    const t = a.dueDate.getTime() - b.dueDate.getTime();
    return t !== 0 ? t : a.sequence - b.sequence;
  });

  let remaining = D(paymentAmount);
  const allocations: AllocationResult['allocations'] = [];
  const updated: AllocationResult['updated'] = [];

  for (const inst of ordered) {
    if (remaining.lte(0)) break;

    const base = D(inst.amount);
    const lateFee = D(inst.lateFee ?? 0);
    const alreadyPaid = D(inst.paidAmount ?? 0);
    const totalOwed = base.plus(lateFee);
    const outstanding = totalOwed.minus(alreadyPaid);

    if (outstanding.lte(0)) continue; // ya saldada

    const take: Decimal = Decimal.min(remaining, outstanding);
    if (take.lte(0)) continue;

    remaining = remaining.minus(take);
    const newPaid = alreadyPaid.plus(take);

    allocations.push({
      installmentId: inst.id,
      sequence: inst.sequence,
      amount: toMoney(take),
    });
    updated.push({
      id: inst.id,
      sequence: inst.sequence,
      paidAmount: toMoney(newPaid),
      status: newPaid.gte(totalOwed) ? 'PAID' : 'PARTIAL',
    });
  }

  const applied = D(paymentAmount).minus(remaining);
  return {
    allocations,
    applied: toMoney(applied),
    leftover: toMoney(remaining),
    updated,
  };
}
