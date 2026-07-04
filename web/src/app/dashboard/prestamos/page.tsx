'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CreateLoanDialog } from '@/components/create-loan-dialog';
import { PayDialog } from '@/components/pay-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchLoans, fetchRoutes, type Loan, type Route } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/utils';
import { Eye, Radio } from 'lucide-react';

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

  const columns: Column<Loan>[] = [
    {
      key: 'clientName',
      header: 'Cliente',
      sortable: true,
      sortValue: (l) => l.clientName ?? '',
      render: (l) => (
        <div>
          <p className="font-medium">{l.clientName ?? '—'}</p>
          {l.routeName ? <p className="text-xs text-muted-foreground">{l.routeName}</p> : null}
        </div>
      ),
    },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (l) => l.status, render: (l) => <Badge variant={statusVariant[l.status] ?? 'secondary'}>{l.status}</Badge> },
    { key: 'totalDue', header: 'Total', sortable: true, sortValue: (l) => l.totalDue, render: (l) => money(l.totalDue) },
    { key: 'paidAmount', header: 'Pagado', sortable: true, sortValue: (l) => l.paidAmount, render: (l) => <span className="text-emerald-600">{money(l.paidAmount)}</span> },
    { key: 'balance', header: 'Saldo', sortable: true, sortValue: (l) => l.balance, render: (l) => <span className="font-semibold">{money(l.balance)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (l) => (
        <div className="flex justify-end">
          <PayDialog loan={l} onPaid={load} />
        </div>
      ),
    },
  ];

  const rowActions = (l: Loan): RowAction<Loan>[] => [
    { label: 'Ver crédito', icon: Eye, onClick: () => router.push(`/dashboard/loan/${l.id}`) },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Préstamos"
        description="La cartera de créditos: cada préstamo con su cliente, ruta, total a pagar, abonado y saldo. Crea nuevos créditos, búscalos, ordénalos y registra abonos. Se actualiza en tiempo real."
        actions={
          <Badge variant={live ? 'success' : 'secondary'} className="gap-1">
            <Radio className="h-3 w-3" /> {live ? 'En vivo' : 'Desconectado'}
          </Badge>
        }
      />
      <DataTable
        rows={loans}
        columns={columns}
        rowActions={rowActions}
        search={(l) => l.clientName ?? ''}
        searchPlaceholder="Buscar cliente…"
        empty="No hay créditos."
        toolbar={
          <div className="flex items-center gap-2">
            <Select value={routeId || 'all'} onValueChange={(v) => setRouteId(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rutas</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CreateLoanDialog onCreated={load} />
          </div>
        }
      />
    </div>
  );
}
