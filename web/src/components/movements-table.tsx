'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  return (
    <Card>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{empty}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Cobrador</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => {
                const positive = POSITIVE.has(m.type);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge variant={m.type === 'COLLECTION' ? 'success' : 'secondary'}>
                        {MOVEMENT_LABEL[m.type] ?? m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={positive ? 'font-semibold text-emerald-600' : 'font-semibold text-destructive'}>
                      {positive ? '+' : '−'}
                      {money(m.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.note ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{m.collectorName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
