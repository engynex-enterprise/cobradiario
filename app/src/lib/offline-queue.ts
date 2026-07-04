import AsyncStorage from '@react-native-async-storage/async-storage';
import { GraphQLError } from './api';
import { registerPayment } from './graphql';

/**
 * Cola de abonos offline-first para cobro en ruta (sin señal).
 *
 * Cada abono lleva un `clientRequestId` único; el backend es idempotente por esa clave
 * (ver PaymentsService), así que reenviar un abono cuyo response se perdió NO genera doble
 * cobro. Los abonos se persisten en AsyncStorage y se drenan cuando hay conexión.
 */
const QUEUE_KEY = 'cd_payment_queue';

export interface QueuedPayment {
  clientRequestId: string;
  loanId: string;
  amount: number;
  latitude?: number;
  longitude?: number;
  createdAt: number;
}

function newRequestId(loanId: string): string {
  return `${loanId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function read(): Promise<QueuedPayment[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedPayment[]) : [];
}

async function write(items: QueuedPayment[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueuePayment(
  input: { loanId: string; amount: number; latitude?: number; longitude?: number },
): Promise<QueuedPayment> {
  const item: QueuedPayment = { ...input, clientRequestId: newRequestId(input.loanId), createdAt: Date.now() };
  const items = await read();
  items.push(item);
  await write(items);
  return item;
}

export async function pendingCount(): Promise<number> {
  return (await read()).length;
}

export interface FlushResult {
  sent: number;
  rejected: number;
  remaining: number;
}

/**
 * Intenta enviar todos los abonos encolados.
 * - éxito o rechazo de negocio → se retira de la cola.
 * - error de red → se detiene y se reintenta en el próximo flush (mantiene el orden).
 */
export async function flushQueue(): Promise<FlushResult> {
  const items = await read();
  let sent = 0;
  let rejected = 0;

  const remaining: QueuedPayment[] = [];
  let networkDown = false;

  for (const item of items) {
    if (networkDown) {
      remaining.push(item);
      continue;
    }
    try {
      await registerPayment({
        loanId: item.loanId,
        amount: item.amount,
        clientRequestId: item.clientRequestId,
        latitude: item.latitude,
        longitude: item.longitude,
      });
      sent += 1;
    } catch (err) {
      if (err instanceof GraphQLError) {
        // El servidor lo procesó y lo rechazó (o ya estaba aplicado): no reintentar.
        rejected += 1;
      } else {
        // Error de red/servidor caído: conservar y frenar el drenado.
        networkDown = true;
        remaining.push(item);
      }
    }
  }

  await write(remaining);
  return { sent, rejected, remaining: remaining.length };
}
