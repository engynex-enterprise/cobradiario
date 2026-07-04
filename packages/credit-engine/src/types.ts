/**
 * Tipos del motor de crédito. Los valores string coinciden 1:1 con los enums de Prisma
 * (schema.prisma) para poder mapear sin conversiones, pero el paquete NO depende de Prisma:
 * es lógica pura y testeable en aislamiento.
 */

export type InterestMethod = 'FLAT' | 'DECLINING_BALANCE' | 'GERMAN' | 'INTEREST_ONLY' | 'CUSTOM';
export type RateBasis = 'PER_LOAN' | 'PER_PERIOD' | 'ANNUAL';
export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
export type LateFeeType =
  | 'NONE'
  | 'FIXED'
  | 'PERCENT_OF_INSTALLMENT'
  | 'PERCENT_OF_BALANCE'
  | 'DAILY_PERCENT';
export type RoundingMode = 'NONE' | 'UP' | 'DOWN' | 'NEAREST';

/** Parámetros del producto de crédito (snapshot congelado en cada crédito al originar). */
export interface CreditTerms {
  interestMethod: InterestMethod;
  /** Tasa. Interpretación según `rateBasis` y método. Ej. 0.2 = 20%. */
  interestRate: number;
  rateBasis: RateBasis;
  frequency: Frequency;
  /** Número de cuotas. */
  termCount: number;
  graceDays?: number;

  lateFeeType?: LateFeeType;
  lateFeeValue?: number;

  roundingMode?: RoundingMode;
  /** Redondear el valor de la cuota a múltiplos de este monto (ej. 100 pesos). */
  roundTo?: number;

  /** Periodos por año para convertir tasas ANNUAL. Override opcional del default por frecuencia. */
  periodsPerYear?: number;
  /** Días entre cuotas cuando frequency = CUSTOM. */
  customIntervalDays?: number;

  /** Días de la semana sin cobro (0=domingo … 6=sábado). Las cuotas saltan esos días. */
  nonPayDays?: number[];

  /** Extensión libre para estrategias CUSTOM. */
  config?: Record<string, unknown>;
}

export interface ScheduleInput {
  principal: number;
  /** Fecha de la primera cuota (las siguientes se derivan por frecuencia). */
  firstDueDate: Date;
  terms: CreditTerms;
}

export interface ScheduledInstallment {
  sequence: number;
  dueDate: Date;
  amount: number;
  principalPart: number;
  interestPart: number;
}

export interface Schedule {
  principal: number;
  interestTotal: number;
  totalDue: number;
  installments: ScheduledInstallment[];
}

/** Estrategia para InterestMethod = CUSTOM. Registrable por el consumidor. */
export type CustomStrategy = (input: ScheduleInput) => Schedule;

/** Cuota mínima requerida por el asignador de pagos. */
export interface AllocatableInstallment {
  id: string;
  sequence: number;
  dueDate: Date;
  /** Valor base de la cuota. */
  amount: number;
  /** Mora acumulada de la cuota. */
  lateFee?: number;
  /** Ya pagado previamente. */
  paidAmount?: number;
}

export interface Allocation {
  installmentId: string;
  sequence: number;
  amount: number;
}

export interface AllocationResult {
  allocations: Allocation[];
  /** Total efectivamente aplicado a cuotas. */
  applied: number;
  /** Sobrante no aplicado (posible saldo a favor / abono a capital). */
  leftover: number;
  /** Estado resultante por cuota tocada. */
  updated: Array<{
    id: string;
    sequence: number;
    paidAmount: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID';
  }>;
}
