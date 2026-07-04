'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fetchDueInstallments, fetchDashboardStats, registerPayment, createManagement,
  type DueInstallment, type ManagementType,
} from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { formatDate, money, cn } from '@/lib/utils';
import {
  CalendarCheck, Wallet, Eye, ClipboardList, Target, AlertTriangle, Users, Coins,
  Phone, MapPin, MessageCircle, Loader2, HandCoins,
} from 'lucide-react';

type Tab = 'TODAY' | 'OVERDUE' | 'UPCOMING';
const TABS: { key: Tab; label: string }[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'OVERDUE', label: 'Vencidas' },
  { key: 'UPCOMING', label: 'Próximas' },
];

const MODULE_INFO = {
  summary: 'La agenda de cobro en campo: reúne todas las cuotas que hay que gestionar, agrupadas por urgencia (hoy, vencidas y próximas).',
  purpose:
    'Le dice al cobrador y al administrador exactamente a quién visitar, cuánto pedir y qué está en mora, para no dejar plata sin recoger y priorizar lo vencido.',
  how: [
    'Elige la pestaña: "Hoy" (vencen hoy), "Vencidas" (ya pasaron y generan mora) o "Próximas" (aún no vencen).',
    'La barra de "Meta del día" muestra cuánto has recaudado frente a lo esperado hoy.',
    'En cada fila: "Abonar" registra el pago del cliente al instante y descuenta del saldo.',
    'El menú (⋮) permite registrar una gestión (visita, llamada, promesa de pago) o abrir el crédito.',
    'Busca por cliente o filtra por ruta para enfocar la jornada.',
  ],
  technical:
    'Cada fila es una Installment con dueDate ≤ hoy (TODAY/OVERDUE) o futura (UPCOMING). El saldo de la cuota = amount + lateFee − paidAmount. "Abonar" llama registerPayment(loanId, amount) con un clientRequestId idempotente que evita el doble cobro ante reintentos; el motor reparte el abono entre capital, interés, cargos y mora.',
  plain:
    'Es la lista del día del cobrador: "Hoy tengo que visitar a Ana ($15.000), a Luis ($20.000) y a Pedro que ya se atrasó. Cuando Ana me paga, aprieto Abonar y su deuda baja. Si Pedro no está, dejo una nota de que promete pagar el viernes."',
  tips: [
    'Prioriza siempre la pestaña "Vencidas": es la cartera en riesgo.',
    'Registra una gestión aunque el cliente no pague: deja rastro de la visita y la promesa.',
    'El monto de "Abonar" viene precargado con el saldo de la cuota, pero puedes cambiarlo si el cliente abona parcial.',
  ],
};

export default function CobroPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('TODAY');
  const [lists, setLists] = useState<Record<Tab, DueInstallment[]>>({ TODAY: [], OVERDUE: [], UPCOMING: [] });
  const [collectedToday, setCollectedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [routeFilter, setRouteFilter] = useState('all');
  const [payFor, setPayFor] = useState<DueInstallment | null>(null);
  const [mngFor, setMngFor] = useState<DueInstallment | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetchDueInstallments('TODAY'),
      fetchDueInstallments('OVERDUE'),
      fetchDueInstallments('UPCOMING'),
      fetchDashboardStats(),
    ])
      .then(([t, o, u, s]) => {
        setLists({ TODAY: t.dueInstallments, OVERDUE: o.dueInstallments, UPCOMING: u.dueInstallments });
        setCollectedToday(s.dashboardStats.collectedToday);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  // Refresco en vivo: cuando cualquier cobrador registra un abono.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onPayment = () => load(true);
    socket.on('payment.registered', onPayment);
    return () => { socket.off('payment.registered', onPayment); };
  }, [load]);

  const today = lists.TODAY;
  const saldo = (i: DueInstallment) => i.amount + i.lateFee - i.paidAmount;

  // Meta del día: avance de las cuotas que vencen hoy (incluye ya pagadas).
  const esperadoHoy = today.reduce((s, i) => s + i.amount + i.lateFee, 0);
  const cobradoMeta = today.reduce((s, i) => s + Math.min(i.paidAmount, i.amount + i.lateFee), 0);
  const metaPct = esperadoHoy > 0 ? Math.min(100, Math.round((cobradoMeta / esperadoHoy) * 100)) : 0;
  const porCobrarHoy = today.reduce((s, i) => s + saldo(i), 0);
  const clientesHoy = new Set(today.map((i) => i.clientName)).size;
  const moraMonto = lists.OVERDUE.reduce((s, i) => s + saldo(i), 0);

  const current = lists[tab];
  const routes = useMemo(
    () => Array.from(new Set(current.map((i) => i.routeName).filter(Boolean))) as string[],
    [current],
  );
  const rows = routeFilter === 'all' ? current : current.filter((i) => i.routeName === routeFilter);

  const columns: Column<DueInstallment>[] = [
    {
      key: 'clientName', header: 'Cliente', sortable: true, sortValue: (i) => i.clientName ?? '',
      render: (i) => (
        <div>
          <p className="font-semibold">{i.clientName ?? '—'}</p>
          {i.routeName && <p className="text-xs text-muted-foreground">{i.routeName}</p>}
        </div>
      ),
    },
    { key: 'sequence', header: 'Cuota #', sortable: true, sortValue: (i) => i.sequence, render: (i) => `#${i.sequence}` },
    {
      key: 'dueDate', header: 'Vence', sortable: true, sortValue: (i) => i.dueDate,
      render: (i) => <span className={i.status === 'OVERDUE' ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{formatDate(i.dueDate)}</span>,
    },
    { key: 'saldo', header: 'Saldo', className: 'text-right', sortable: true, sortValue: (i) => saldo(i), render: (i) => <span className="font-bold">{money(saldo(i))}</span> },
    { key: 'lateFee', header: 'Mora', className: 'text-right', render: (i) => <span className={i.lateFee > 0 ? 'text-destructive' : 'text-muted-foreground'}>{money(i.lateFee)}</span> },
    { key: 'status', header: 'Estado', render: (i) => <Badge variant={statusVariant(i.status)}>{statusLabel(i.status)}</Badge> },
    {
      key: 'pay', header: '', className: 'text-right',
      render: (i) => (
        <Button size="sm" variant="outline" disabled={i.status === 'PAID'} onClick={() => setPayFor(i)}>
          <Wallet className="h-4 w-4" /> Abonar
        </Button>
      ),
    },
  ];

  const rowActions = (i: DueInstallment): RowAction<DueInstallment>[] => [
    { label: 'Registrar gestión', icon: ClipboardList, onClick: () => setMngFor(i) },
    { label: 'Ver crédito', icon: Eye, onClick: () => router.push(`/dashboard/loan/${i.loanId}`) },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={CalendarCheck}
        title="Cobro del día"
        description="Cuotas a gestionar en campo: hoy, vencidas y próximas. Registra abonos y gestiones sin salir de aquí."
        info={MODULE_INFO}
        actions={
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />} Actualizar
          </Button>
        }
      />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<HandCoins className="h-5 w-5" />} label="Por cobrar hoy" value={money(porCobrarHoy)} />
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Cobrado hoy" value={money(collectedToday)} tone="primary" />
        <Kpi icon={<Users className="h-5 w-5" />} label="Clientes de hoy" value={String(clientesHoy)} />
        <Kpi icon={<AlertTriangle className="h-5 w-5" />} label="Vencidas" value={`${lists.OVERDUE.length} · ${money(moraMonto)}`} tone={lists.OVERDUE.length > 0 ? 'destructive' : undefined} />
      </section>

      {/* Meta del día */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>
              <div>
                <p className="font-extrabold leading-tight">Meta de cobro de hoy</p>
                <p className="text-xs text-muted-foreground">{money(cobradoMeta)} de {money(esperadoHoy)} · {today.filter((i) => i.status === 'PAID').length}/{today.length} cuotas</p>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-primary">{metaPct}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${metaPct}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs con conteos */}
      <div className="flex gap-1 border-b-2 border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setRouteFilter('all'); }}
            className={cn(
              '-mb-0.5 flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className={cn('rounded-full px-2 py-0.5 text-xs', tab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
              {lists[t.key].length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowActions={rowActions}
          search={(i) => `${i.clientName ?? ''} ${i.routeName ?? ''}`}
          searchPlaceholder="Buscar cliente/ruta…"
          empty={tab === 'OVERDUE' ? '¡Sin cuotas vencidas! 🎉' : 'Sin cuotas en este periodo.'}
          toolbar={
            routes.length > 0 ? (
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las rutas</SelectItem>
                  {routes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />
      )}

      <PayInstallmentDialog installment={payFor} onClose={() => setPayFor(null)} onDone={load} />
      <ManagementDialog installment={mngFor} onClose={() => setMngFor(null)} onDone={load} />
    </div>
  );
}

function statusVariant(s: string): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  if (s === 'PAID') return 'success';
  if (s === 'OVERDUE') return 'destructive';
  if (s === 'PARTIAL') return 'warning';
  return 'secondary';
}
function statusLabel(s: string) {
  return ({ PAID: 'Pagada', OVERDUE: 'Vencida', PARTIAL: 'Parcial', PENDING: 'Pendiente' } as Record<string, string>)[s] ?? s;
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'primary' | 'destructive' }) {
  const cls = tone === 'destructive' ? 'bg-destructive/10 text-destructive' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`flex size-11 items-center justify-center rounded-2xl ${cls}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-extrabold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Abono directo desde la agenda de cobro (precarga el saldo de la cuota). */
function PayInstallmentDialog({ installment, onClose, onDone }: { installment: DueInstallment | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const saldo = installment ? installment.amount + installment.lateFee - installment.paidAmount : 0;

  useEffect(() => { if (installment) setAmount(installment.amount + installment.lateFee - installment.paidAmount); }, [installment]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!installment) return;
    setLoading(true);
    try {
      const { registerPayment: r } = await registerPayment({
        loanId: installment.loanId,
        amount,
        clientRequestId: `${installment.id}-${amount}`,
      });
      toast.success(`Abono aplicado: ${money(r.applied)}`, { description: `Saldo del crédito: ${money(r.loan.balance)}` });
      onClose();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar abono');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={installment !== null} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Registrar abono</DialogTitle>
          <DialogDescription>
            {installment?.clientName ?? ''} · cuota #{installment?.sequence} · saldo{' '}
            <span className="font-semibold text-foreground">{money(saldo)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Monto a abonar</Label>
            <CurrencyInput value={amount} onValueChange={setAmount} />
            <div className="flex gap-2">
              <QuickAmt label="Saldo" onClick={() => setAmount(saldo)} />
              <QuickAmt label="Mitad" onClick={() => setAmount(Math.round(saldo / 2))} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || amount <= 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Aplicar abono
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickAmt({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border-2 border-border px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
      {label}
    </button>
  );
}

const MNG_TYPES: { key: ManagementType; label: string; icon: React.ReactNode }[] = [
  { key: 'VISIT', label: 'Visita', icon: <MapPin className="h-4 w-4" /> },
  { key: 'CALL', label: 'Llamada', icon: <Phone className="h-4 w-4" /> },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" /> },
  { key: 'OTHER', label: 'Otro', icon: <ClipboardList className="h-4 w-4" /> },
];

/** Registrar una gestión de cobranza (visita/llamada + promesa de pago opcional). */
function ManagementDialog({ installment, onClose, onDone }: { installment: DueInstallment | null; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<ManagementType>('VISIT');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (installment) { setType('VISIT'); setResult(''); setNote(''); setPromiseAmount(0); setPromiseDate(''); }
  }, [installment]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!installment) return;
    setLoading(true);
    try {
      await createManagement({
        loanId: installment.loanId,
        type,
        result: result.trim() || undefined,
        note: note.trim() || undefined,
        promiseAmount: promiseAmount > 0 ? promiseAmount : undefined,
        promiseDate: promiseDate ? new Date(promiseDate).toISOString() : undefined,
      });
      toast.success('Gestión registrada');
      onClose();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={installment !== null} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Registrar gestión</DialogTitle>
          <DialogDescription>{installment?.clientName ?? ''} · cuota #{installment?.sequence}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de gestión</Label>
            <div className="grid grid-cols-4 gap-2">
              {MNG_TYPES.map((t) => (
                <button
                  key={t.key} type="button" onClick={() => setType(t.key)}
                  className={cn('flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-bold transition-colors',
                    type === t.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Resultado</Label>
            <Input value={result} onChange={(e) => setResult(e.target.value)} placeholder="Ej: Promesa de pago, No estaba, Abonó parcial…" />
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Detalle de la gestión"
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Promesa ($)</Label>
              <CurrencyInput value={promiseAmount} onValueChange={setPromiseAmount} />
            </div>
            <div className="space-y-2">
              <Label>Fecha promesa</Label>
              <Input type="date" value={promiseDate} onChange={(e) => setPromiseDate(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar gestión
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
