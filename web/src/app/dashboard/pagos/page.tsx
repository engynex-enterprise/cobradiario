'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { fetchRecentPayments, type PaymentFeedItem } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { formatDate, money } from '@/lib/utils';

const methodLabel: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

export default function PagosPage() {
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Pagos"
        description="Historial de abonos recibidos en todos los créditos: monto, método, cobrador y fecha. Cada abono se descuenta del saldo del crédito y alimenta la caja del cobrador."
        actions={
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{money(total)}</span>
          </span>
        }
      />
      <DataTable
        rows={items}
        columns={columns}
        search={(p) => `${p.clientName ?? ''} ${p.collectorName ?? ''}`}
        searchPlaceholder="Buscar por cliente/cobrador…"
        empty="Aún no hay pagos."
      />
    </div>
  );
}
