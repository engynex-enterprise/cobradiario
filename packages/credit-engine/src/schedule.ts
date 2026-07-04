import { D, Decimal, roundInstallment, toMoney } from './money';
import { dueDateFor, periodsPerYear } from './dates';
import type {
  CustomStrategy,
  Schedule,
  ScheduledInstallment,
  ScheduleInput,
} from './types';

/**
 * Genera el plan de cuotas de un crédito según sus términos configurables.
 *
 * @param strategies mapa opcional de estrategias para InterestMethod = CUSTOM.
 * @throws si termCount/principal son inválidos o CUSTOM no tiene estrategia registrada.
 */
export function generateSchedule(
  input: ScheduleInput,
  strategies?: Record<string, CustomStrategy>,
): Schedule {
  const { principal, terms } = input;
  const n = terms.termCount;

  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error('El principal debe ser un número positivo');
  }
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('termCount debe ser un entero positivo');
  }

  switch (terms.interestMethod) {
    case 'FLAT':
      return flatSchedule(input);
    case 'DECLINING_BALANCE':
      return decliningBalanceSchedule(input);
    case 'CUSTOM': {
      const key = String(terms.config?.strategy ?? '');
      const strategy = strategies?.[key];
      if (!strategy) {
        throw new Error(
          `InterestMethod=CUSTOM requiere una estrategia registrada (config.strategy="${key}")`,
        );
      }
      return strategy(input);
    }
    default:
      throw new Error(`InterestMethod no soportado: ${String(terms.interestMethod)}`);
  }
}

// ---------------------------------------------------------------------------
// FLAT — interés fijo "gota a gota"
// ---------------------------------------------------------------------------
function flatSchedule(input: ScheduleInput): Schedule {
  const { principal, firstDueDate, terms } = input;
  const n = terms.termCount;
  const P = D(principal);
  const r = D(terms.interestRate);

  let interestTotal: Decimal;
  switch (terms.rateBasis) {
    case 'PER_LOAN':
      interestTotal = P.mul(r);
      break;
    case 'PER_PERIOD':
      interestTotal = P.mul(r).mul(n);
      break;
    case 'ANNUAL': {
      const ppy = periodsPerYear(terms.frequency, terms.periodsPerYear);
      interestTotal = P.mul(r).mul(D(n).div(ppy));
      break;
    }
    default:
      interestTotal = P.mul(r);
  }

  const totalDue = P.plus(interestTotal);
  const baseInstallment = D(
    roundInstallment(totalDue.div(n), terms.roundingMode, terms.roundTo),
  );

  const installments: ScheduledInstallment[] = [];
  let accumulated = D(0);
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    // La última cuota absorbe el remanente del redondeo para que la suma cuadre exacto.
    const amount = isLast ? totalDue.minus(accumulated) : baseInstallment;
    accumulated = accumulated.plus(amount);

    // Reparto interés/capital proporcional al total, garantizando amount = capital + interés.
    const interestPart = D(toMoney(amount.mul(interestTotal).div(totalDue)));
    const principalPart = amount.minus(interestPart);

    installments.push({
      sequence: i + 1,
      dueDate: dueDateFor(firstDueDate, i, terms.frequency, terms.customIntervalDays),
      amount: toMoney(amount),
      interestPart: toMoney(interestPart),
      principalPart: toMoney(principalPart),
    });
  }

  return {
    principal: toMoney(P),
    interestTotal: toMoney(interestTotal),
    totalDue: toMoney(totalDue),
    installments,
  };
}

// ---------------------------------------------------------------------------
// DECLINING_BALANCE — amortización sobre saldo (cuota fija estilo francés)
// ---------------------------------------------------------------------------
function decliningBalanceSchedule(input: ScheduleInput): Schedule {
  const { principal, firstDueDate, terms } = input;
  const n = terms.termCount;
  const P = D(principal);

  // Tasa por período según la base.
  let i: Decimal;
  switch (terms.rateBasis) {
    case 'PER_PERIOD':
      i = D(terms.interestRate);
      break;
    case 'ANNUAL':
      i = D(terms.interestRate).div(periodsPerYear(terms.frequency, terms.periodsPerYear));
      break;
    case 'PER_LOAN':
    default:
      // Tasa total del crédito repartida entre períodos.
      i = D(terms.interestRate).div(n);
      break;
  }

  // Cuota fija A = P * i / (1 - (1+i)^-n); si i=0 → P/n.
  let payment: Decimal;
  if (i.isZero()) {
    payment = P.div(n);
  } else {
    const onePlusI = i.plus(1);
    const factor = D(1).minus(onePlusI.pow(-n));
    payment = P.mul(i).div(factor);
  }
  const roundedPayment = D(roundInstallment(payment, terms.roundingMode, terms.roundTo));

  const installments: ScheduledInstallment[] = [];
  let balance = P;
  let interestTotal = D(0);

  for (let k = 0; k < n; k++) {
    const isLast = k === n - 1;
    const interestPart = D(toMoney(balance.mul(i)));
    let principalPart: Decimal;
    let amount: Decimal;

    if (isLast) {
      // Última cuota liquida el saldo exacto.
      principalPart = balance;
      amount = principalPart.plus(interestPart);
    } else {
      amount = roundedPayment;
      principalPart = amount.minus(interestPart);
    }

    balance = balance.minus(principalPart);
    interestTotal = interestTotal.plus(interestPart);

    installments.push({
      sequence: k + 1,
      dueDate: dueDateFor(firstDueDate, k, terms.frequency, terms.customIntervalDays),
      amount: toMoney(amount),
      interestPart: toMoney(interestPart),
      principalPart: toMoney(principalPart),
    });
  }

  const totalDue = installments.reduce((s, it) => s.plus(it.amount), D(0));
  return {
    principal: toMoney(P),
    interestTotal: toMoney(interestTotal),
    totalDue: toMoney(totalDue),
    installments,
  };
}
