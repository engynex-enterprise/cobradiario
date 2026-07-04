'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CreateLoanDialog } from '@/components/create-loan-dialog';
import { PayDialog } from '@/components/pay-dialog';
import { Button } from '@/components/ui/button';
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
import { PageHeader } from '@/components/page-header';
import { fetchLoans, fetchRoutes, type Loan, type Route } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/utils';
import { Radio, Search } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  ACTIVE: 'default',
  PAID: 'success',
  DEFAULTED: 'destructive',
  PENDING_APPROVAL: 'warning',
};

export default function PrestamosPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState('');
  const [q, setQ] = useState('');
  const [live, setLive] = useState(false);

  const load = useCallback(() => {
    fetchLoans(routeId || undefined)
      .then((d) => setLoans(d.loans))
      .catch((e) => toast.error(e.message));
  }, [routeId]);

  useEffect(() => load(), [load]);
  useEffect(() => {
    fetchRoutes().then((d) => setRoutes(d.routes)).catch(() => {});
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    const onPayment = () => load();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('payment.registered', onPayment);
    if (socket.connected) setLive(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('payment.registered', onPayment);
    };
  }, [load]);

  const filtered = loans.filter((l) => (l.clientName ?? '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Préstamos"
        description="La cartera de créditos: cada préstamo con su cliente, ruta, total a pagar, abonado y saldo. Crea nuevos créditos, búscalos y registra abonos. Se actualiza en tiempo real."
        actions={
          <Badge variant={live ? 'success' : 'secondary'} className="gap-1">
            <Radio className="h-3 w-3" /> {live ? 'En vivo' : 'Desconectado'}
          </Badge>
        }
      />

      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">Cartera de créditos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar cliente…"
                className="h-9 w-44 border border-input bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              className="h-9 border border-input bg-background px-2 text-sm"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
            >
              <option value="">Todas las rutas</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <CreateLoanDialog onCreated={load} />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No hay créditos.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total a pagar</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.clientName ?? '—'}</p>
                      {l.routeName ? <p className="text-xs text-muted-foreground">{l.routeName}</p> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[l.status] ?? 'secondary'}>{l.status}</Badge>
                    </TableCell>
                    <TableCell>{money(l.totalDue)}</TableCell>
                    <TableCell className="text-emerald-600">{money(l.paidAmount)}</TableCell>
                    <TableCell className="font-semibold">{money(l.balance)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/loan/${l.id}`)}>
                          Ver
                        </Button>
                        <PayDialog loan={l} onPaid={load} />
                      </div>
                    </TableCell>
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
