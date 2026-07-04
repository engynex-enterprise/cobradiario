'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { fetchRecentPayments, type PaymentFeedItem } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { formatDate, money } from '@/lib/utils';
import { Eye } from 'lucide-react';

const methodLabel: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

const MODULE_INFO = {
  summary: 'El historial de todos los abonos recibidos en cualquier crédito: monto, método, cobrador y fecha.',
  purpose:
    'Da trazabilidad total del dinero que entra: quién pagó, cuánto, cómo y quién lo recibió. Es la auditoría del recaudo.',
  how: [
    'Cada fila es un abono ya aplicado a un crédito.',
    'Busca por cliente o cobrador y ordena por monto o fecha.',
    'El total arriba a la derecha suma los abonos mostrados.',
    'El menú (⋮) → "Ver crédito" abre el préstamo al que pertenece el abono.',
  ],
  technical:
    'Cada Payment se reparte (allocation) entre las cuotas del crédito por orden: primero mora y cargos, luego interés y capital. Se registra con clientRequestId idempotente y emite el evento payment.registered por WebSocket, que refresca esta lista en vivo.',
  plain:
    'Es el recibo de caja del negocio: "Hoy Ana abonó $15.000 en efectivo, se los recibió Luis a las 10 a.m.". Aquí queda la constancia de cada pago para que nada se pierda ni se cobre dos veces.',
  tips: [
    'Filtra mentalmente por cobrador para cuadrar la caja de cada uno al cierre.',
    'Si un abono se ve mal, entra a "Ver crédito" para revisar el plan de pagos.',
  ],
};

export default function PagosPage() {
  const router = useRouter();
  const [items, setItems] = useState<PaymentFeedItem[]>([]);

  const load = useCallback(() => {
    fetchRecentPayments()
      .then((d) => setItems(d.recentPayments))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onPay = () => load();
    socket.on('payment.registered', onPay);
    return () => {
      socket.off('payment.registered', onPay);
    };
  }, [load]);

  const total = items.reduce((s, p) => s + p.amount, 0);

  const columns: Column<PaymentFeedItem>[] = [
    { key: 'clientName', header: 'Cliente', sortable: true, sortValue: (p) => p.clientName ?? '', render: (p) => <span className="font-medium">{p.clientName ?? '—'}</span> },
    { key: 'amount', header: 'Monto', sortable: true, sortValue: (p) => p.amount, render: (p) => <span className="font-semibold text-emerald-600">{money(p.amount)}</span> },
    { key: 'method', header: 'Método', render: (p) => <Badge variant="secondary">{methodLabel[p.method] ?? p.method}</Badge> },
    { key: 'collectorName', header: 'Cobrador', sortable: true, sortValue: (p) => p.collectorName ?? '', render: (p) => <span className="text-muted-foreground">{p.collectorName ?? '—'}</span> },
    { key: 'paidAt', header: 'Fecha', sortable: true, sortValue: (p) => p.paidAt, render: (p) => <span className="text-muted-foreground">{formatDate(p.paidAt)}</span> },
  ];

  const rowActions = (p: PaymentFeedItem): RowAction<PaymentFeedItem>[] => [
    { label: 'Ver crédito', icon: Eye, onClick: () => router.push(`/dashboard/loan/${p.loanId}`) },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Pagos"
        description="Historial de abonos recibidos en todos los créditos: monto, método, cobrador y fecha. Cada abono se descuenta del saldo del crédito y alimenta la caja del cobrador."
        info={MODULE_INFO}
        actions={
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{money(total)}</span>
          </span>
        }
      />
      <DataTable
        rows={items}
        columns={columns}
        rowActions={rowActions}
        search={(p) => `${p.clientName ?? ''} ${p.collectorName ?? ''}`}
        searchPlaceholder="Buscar por cliente/cobrador…"
        empty="Aún no hay pagos."
      />
    </div>
  );
}
