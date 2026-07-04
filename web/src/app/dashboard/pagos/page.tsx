'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Últimos abonos</CardTitle>
          <span className="text-sm text-muted-foreground">
            {items.length} · <span className="font-semibold text-foreground">{money(total)}</span>
          </span>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Aún no hay pagos.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Cobrador</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.clientName ?? '—'}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">{money(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{methodLabel[p.method] ?? p.method}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.collectorName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
