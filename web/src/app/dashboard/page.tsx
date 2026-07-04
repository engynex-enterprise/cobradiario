'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
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
import { fetchLoans, fetchRoutes, type Loan, type Route } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/utils';
import { Landmark, Radio, TrendingUp, Wallet } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  ACTIVE: 'default',
  PAID: 'success',
  DEFAULTED: 'destructive',
  PENDING_APPROVAL: 'warning',
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
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

  // Guard de autenticación.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (user) fetchRoutes().then((d) => setRoutes(d.routes)).catch(() => {});
  }, [user]);

  // Realtime: refresca la cartera y notifica cuando entra un abono.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    const onPayment = (p: { amount: number; balance: number; status: string }) => {
      toast.info(`Abono recibido: ${money(p.amount)}`, {
        description: `Saldo del crédito: ${money(p.balance)}`,
      });
      load();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('payment.registered', onPayment);
    if (socket.connected) setLive(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('payment.registered', onPayment);
    };
  }, [user, load]);

  if (authLoading || !user) return null;

  const totalCartera = loans.reduce((s, l) => s + l.balance, 0);
  const totalRecaudado = loans.reduce((s, l) => s + l.paidAmount, 0);
  const activos = loans.filter((l) => l.status === 'ACTIVE').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cartera</h1>
        <Badge variant={live ? 'success' : 'secondary'} className="gap-1">
          <Radio className="h-3 w-3" /> {live ? 'En vivo' : 'Desconectado'}
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Cartera pendiente" value={money(totalCartera)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Recaudado" value={money(totalRecaudado)} />
        <StatCard icon={<Landmark className="h-4 w-4" />} label="Créditos activos" value={String(activos)} />
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-xl">Créditos</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
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
          {loans.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay créditos {routeId ? 'en esta ruta' : 'todavía'}.
            </div>
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
                {loans.map((l) => (
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
