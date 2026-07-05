'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CreateLoanDialog } from '@/components/create-loan-dialog';
import { PayDialog } from '@/components/pay-dialog';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchLoans, fetchRoutes, type Loan, type Route } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/utils';
import { Eye, Radio, HandCoins, Wallet, Banknote, TrendingUp } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'default', PAID: 'success', DEFAULTED: 'destructive', PENDING_APPROVAL: 'warning',
  RENEWED: 'secondary', CANCELLED: 'secondary',
};
const statusLabel: Record<string, string> = {
  ACTIVE: 'Activo', PAID: 'Pagado', DEFAULTED: 'En mora', PENDING_APPROVAL: 'Por aprobar',
  RENEWED: 'Renovado', CANCELLED: 'Cancelado',
};
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'DEFAULTED', 'PAID', 'PENDING_APPROVAL'] as const;

const MODULE_INFO = {
  summary: 'El corazón del negocio: la cartera completa de créditos otorgados, cada uno con su cliente, capital, total a pagar, abonado y saldo.',
  purpose:
    'Permite ver el estado de cada préstamo de un vistazo, crear créditos nuevos con su plan de pagos, registrar abonos y detectar los que están en mora.',
  how: [
    'Los KPIs de arriba resumen la cartera: créditos activos, saldo por cobrar, capital colocado y recaudado.',
    'Filtra por estado (activo, en mora, pagado…) o por ruta, y busca por cliente.',
    'La columna "Avance" muestra qué porcentaje del crédito ya se ha pagado.',
    'El botón "Abonar" registra un pago que se reparte automáticamente entre las cuotas.',
    'El menú (⋮) o "Ver crédito" abre el detalle con el plan de pagos, historial y gestiones.',
  ],
  technical:
    'Cada Loan tiene principal (capital), interestTotal, totalDue (= capital + interés + cargos) y balance (= totalDue − paidAmount). El avance = paidAmount / totalDue. El estado DEFAULTED lo marca el job de mora (02:00) cuando una cuota vence sin pagarse. Se actualiza en vivo por WebSocket ante cada payment.registered.',
  plain:
    'Es el cuaderno del prestamista: "A Ana le presté $100.000 y me tiene que pagar $120.000 en 20 días. Ya me pagó $60.000, le falta $60.000 (voy al 50%). Pedro no ha pagado y ya está en mora." Aquí ves eso de todos tus clientes junto.',
  tips: [
    'Filtra por "En mora" para atacar primero la cartera en riesgo.',
    'El indicador "En vivo" confirma que los abonos de los cobradores llegan en tiempo real.',
    'Usa "Nuevo crédito" para elegir sistema de amortización, cargos, fiador y días sin cobro.',
  ],
};

export default function PrestamosPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
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

  // KPIs (sobre la cartera cargada, ya filtrada por ruta en el servidor)
  const kpis = useMemo(() => {
    const activos = loans.filter((l) => l.status === 'ACTIVE').length;
    const mora = loans.filter((l) => l.status === 'DEFAULTED').length;
    const porCobrar = loans.filter((l) => l.status !== 'PAID' && l.status !== 'CANCELLED').reduce((s, l) => s + l.balance, 0);
    const capital = loans.reduce((s, l) => s + l.principal, 0);
    const recaudado = loans.reduce((s, l) => s + l.paidAmount, 0);
    const totalDue = loans.reduce((s, l) => s + l.totalDue, 0);
    const avance = totalDue > 0 ? Math.round((recaudado / totalDue) * 100) : 0;
    return { activos, mora, porCobrar, capital, recaudado, avance };
  }, [loans]);

  const rows = statusFilter === 'ALL' ? loans : loans.filter((l) => l.status === statusFilter);

  const columns: Column<Loan>[] = [
    {
      key: 'clientName', header: 'Cliente', sortable: true, sortValue: (l) => l.clientName ?? '',
      render: (l) => (
        <div>
          <p className="font-semibold">{l.clientName ?? '—'}</p>
          {l.routeName ? <p className="text-xs text-muted-foreground">{l.routeName}</p> : null}
        </div>
      ),
    },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (l) => l.status, render: (l) => <Badge variant={statusVariant[l.status] ?? 'secondary'}>{statusLabel[l.status] ?? l.status}</Badge> },
    { key: 'totalDue', header: 'Total', className: 'text-right', sortable: true, sortValue: (l) => l.totalDue, render: (l) => money(l.totalDue) },
    { key: 'paidAmount', header: 'Pagado', className: 'text-right', sortable: true, sortValue: (l) => l.paidAmount, render: (l) => <span className="text-emerald-600">{money(l.paidAmount)}</span> },
    { key: 'balance', header: 'Saldo', className: 'text-right', sortable: true, sortValue: (l) => l.balance, render: (l) => <span className="font-bold">{money(l.balance)}</span> },
    {
      key: 'avance', header: 'Avance', sortable: true, sortValue: (l) => (l.totalDue > 0 ? l.paidAmount / l.totalDue : 0),
      render: (l) => {
        const pct = l.totalDue > 0 ? Math.round((l.paidAmount / l.totalDue) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (l) => (
        <div className="flex justify-end">
          {can('register_payments') && <PayDialog loan={l} onPaid={load} />}
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
        description="La cartera de créditos: cliente, total a pagar, abonado y saldo. Crea créditos, filtra, ordena y registra abonos en tiempo real."
        info={MODULE_INFO}
        actions={
          <Badge variant={live ? 'success' : 'secondary'} className="gap-1">
            <Radio className="h-3 w-3" /> {live ? 'En vivo' : 'Desconectado'}
          </Badge>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<HandCoins className="h-5 w-5" />} label="Créditos activos" value={String(kpis.activos)} hint={kpis.mora > 0 ? `${kpis.mora} en mora` : 'Sin mora'} tone={kpis.mora > 0 ? 'destructive' : undefined} />
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Saldo por cobrar" value={money(kpis.porCobrar)} />
        <Kpi icon={<Banknote className="h-5 w-5" />} label="Capital colocado" value={money(kpis.capital)} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Recaudado" value={money(kpis.recaudado)} hint={`${kpis.avance}% de avance`} tone="primary" />
      </section>

      <DataTable
        rows={rows}
        columns={columns}
        rowActions={rowActions}
        search={(l) => `${l.clientName ?? ''} ${l.routeName ?? ''}`}
        searchPlaceholder="Buscar cliente…"
        empty="No hay créditos con este filtro."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="DEFAULTED">En mora</SelectItem>
                <SelectItem value="PAID">Pagados</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Por aprobar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={routeId || 'all'} onValueChange={(v) => setRouteId(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rutas</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {can('manage_loans') && <CreateLoanDialog onCreated={load} />}
          </div>
        }
      />
    </div>
  );
}

function Kpi({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: 'primary' | 'destructive' }) {
  const cls = tone === 'destructive' ? 'bg-destructive/10 text-destructive' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`flex size-11 items-center justify-center rounded-2xl ${cls}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-extrabold">{value}</p>
          {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
