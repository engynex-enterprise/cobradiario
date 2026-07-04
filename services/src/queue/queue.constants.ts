/** Nombres de colas BullMQ (Redis). */
export const QUEUE_MAINTENANCE = 'maintenance';
export const QUEUE_PUSH = 'push';

/** Tipos de job del barrido de mantenimiento. */
export type MaintenanceJob =
  | { type: 'overdue-sweep'; tenantId?: string }
  | { type: 'due-reminders'; tenantId?: string; withinDays?: number };

export interface PushJob {
  tenantId: string;
  userId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
