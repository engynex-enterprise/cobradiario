'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { fetchCashMovements, type CashMovementFeedItem } from '@/lib/graphql';
import { formatDate, money } from '@/lib/utils';

export const MOVEMENT_LABEL: Record<string, string> = {
  OPENING: 'Apertura',
  COLLECTION: 'Cobro',
  DISBURSEMENT: 'Desembolso',
  EXPENSE: 'Gasto',
  DEPOSIT: 'Consignación',
  ADJUSTMENT: 'Ajuste',
  CLOSING: 'Cierre',
};
const POSITIVE = new Set(['OPENING', 'COLLECTION', 'ADJUSTMENT']);

export function MovementsTable({ type, empty }: { type?: string; empty: string }) {
  const [items, setItems] = useState<CashMovementFeedItem[]>([]);

  const load = useCallback(() => {
    fetchCashMovements(type)
      .then((d) => setItems(d.cashMovements))
      .catch((e) => toast.error(e.message));
  }, [type]);
  useEffect(() => load(), [load]);

  const columns: Column<CashMovementFeedItem>[] = [
    {
      key: 'type',
      header: 'Tipo',
      sortable: true,
      sortValue: (m) => m.type,
      render: (m) => (
        <Badge variant={m.type === 'COLLECTION' ? 'success' : 'secondary'}>
          {MOVEMENT_LABEL[m.type] ?? m.type}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      sortable: true,
      sortValue: (m) => m.amount,
      render: (m) => {
        const positive = POSITIVE.has(m.type);
        return (
          <span className={positive ? 'font-semibold text-emerald-600' : 'font-semibold text-destructive'}>
            {positive ? '+' : '−'}
            {money(m.amount)}
          </span>
        );
      },
    },
    { key: 'note', header: 'Nota', render: (m) => <span className="text-muted-foreground">{m.note ?? '—'}</span> },
    {
      key: 'collectorName',
      header: 'Cobrador',
      sortable: true,
      sortValue: (m) => m.collectorName ?? '',
      render: (m) => <span className="text-muted-foreground">{m.collectorName ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      sortable: true,
      sortValue: (m) => m.createdAt,
      render: (m) => <span className="text-muted-foreground">{formatDate(m.createdAt)}</span>,
    },
  ];

  return (
    <DataTable
      rows={items}
      columns={columns}
      search={(m) => `${MOVEMENT_LABEL[m.type] ?? m.type} ${m.note ?? ''} ${m.collectorName ?? ''}`}
      searchPlaceholder="Buscar movimiento…"
      empty={empty}
    />
  );
}
