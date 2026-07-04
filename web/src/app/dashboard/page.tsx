'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchDashboardStats,
  fetchFinancialSummary,
  fetchBalances,
  fetchRecentPayments,
  fetchDueInstallments,
  type DashboardStats,
  type FinancialSummary,
  type Balances,
  type PaymentFeedItem,
  type DueInstallment,
} from '@/lib/graphql';
import { money, formatDate } from '@/lib/utils';
import {
  Wallet, TrendingUp, Landmark, AlertTriangle, CalendarCheck, Users, HandCoins, Coins,
  ArrowRight, Target, BellRing, Trophy, Receipt, Banknote, PiggyBank, Percent, Layers,
} from 'lucide-react';

const ACCENT = '#58cc02';
const INK_MUTED = '#94a3b8';
const GRID = '#e2e8f0';

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(iso + 'T00:00:00Z'));
const compact = (n: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activos', PAID: 'Pagados', DEFAULTED: 'En mora', PENDING_APPROVAL: 'Por aprobar',
  RENEWED: 'Renovados', CANCELLED: 'Cancelados',
};

export default function InicioPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [payments, setPayments] = useState<PaymentFeedItem[]>([]);
  const [dueToday, setDueToday] = useState<DueInstallment[]>([]);
  const [overdue, setOverdue] = useState<DueInstallment[]>([]);

  useEffect(() => {
    fetchDashboardStats().then((d) => setStats(d.dashboardStats)).catch((e) => toast.error(e.message));
    fetchFinancialSummary().then((d) => setSummary(d.financialSummary)).catch(() => {});
    fetchBalances().then((d) => setBalances(d.balances)).catch(() => {});
    fetchRecentPayments().then((d) => setPayments(d.recentPayments)).catch(() => {});
    fetchDueInstallments('TODAY').then((d) => setDueToday(d.dueInstallments)).catch(() => {});
    fetchDueInstallments('OVERDUE').then((d) => setOverdue(d.dueInstallments)).catch(() => {});
  }, []);

  // Meta de cobro del día
  const esperadoHoy = dueToday.reduce((s, i) => s + i.amount + i.lateFee, 0);
  const cobradoCuotasHoy = dueToday.reduce((s, i) => s + i.paidAmount, 0);
  const cuotasPagadas = dueToday.filter((i) => i.status === 'PAID').length;
  const metaPct = esperadoHoy > 0 ? Math.min(100, Math.round((cobradoCuotasHoy / esperadoHoy) * 100)) : 0;

  // Mora
  const moraMonto = overdue.reduce((s, i) => s + (i.amount - i.paidAmount) + i.lateFee, 0);

  // Avance de cartera histórico
  const carteraPct = balances && balances.totalDue > 0 ? Math.round((balances.totalPaid / balances.totalDue) * 100) : 0;

  const chart = (stats?.collectionLast7Days ?? []).map((d) => ({ label: dayLabel(d.date), amount: d.amount }));
  const topCollectors = [...(balances?.byCollector ?? [])].sort((a, b) => b.collected - a.collected).slice(0, 5);
  const maxCollected = topCollectors[0]?.collected || 1;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={`Hola, ${user?.fullName?.split(' ')[0] ?? ''} 👋`}
        description="Tu centro de mando: meta del día, alertas, recaudo, finanzas y desempeño del equipo de un vistazo."
        actions={
          <Button asChild>
            <Link href="/dashboard/cobro"><CalendarCheck className="h-4 w-4" /> Cobro del día</Link>
          </Button>
        }
      />

      {/* KPIs principales */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Cartera pendiente" value={stats ? money(stats.totalPortfolio) : '—'} hint={balances ? `${carteraPct}% recaudado histórico` : undefined} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Recaudado hoy" value={stats ? money(stats.collectedToday) : '—'} tone="primary" />
        <Kpi icon={<PiggyBank className="h-5 w-5" />} label="Ganancia neta (hoy)" value={summary ? money(summary.netProfit) : '—'} tone={summary && summary.netProfit < 0 ? 'destructive' : 'primary'} />
        <Kpi icon={<Landmark className="h-5 w-5" />} label="Créditos activos" value={stats ? String(stats.activeLoans) : '—'} />
      </section>

      {/* Meta del día + Alertas de mora */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>
                <div>
                  <p className="font-extrabold leading-tight">Meta de cobro de hoy</p>
                  <p className="text-xs text-muted-foreground">{cuotasPagadas} de {dueToday.length} cuotas cobradas</p>
                </div>
              </div>
              <span className="text-2xl font-extrabold text-primary">{metaPct}%</span>
            </div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{money(cobradoCuotasHoy)} de {money(esperadoHoy)}</span>
              <Link href="/dashboard/cobro" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                Ir al cobro <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${metaPct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat label="Cuotas hoy" value={String(dueToday.length)} />
              <MiniStat label="Pendientes" value={String(dueToday.length - cuotasPagadas)} />
              <MiniStat label="Esperado" value={money(esperadoHoy)} />
            </div>
          </CardContent>
        </Card>

        <Card className={overdue.length > 0 ? 'border-destructive/40' : undefined}>
          <CardContent className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex size-9 items-center justify-center rounded-xl ${overdue.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}><AlertTriangle className="h-5 w-5" /></span>
              <p className="font-extrabold leading-tight">Alertas de mora</p>
            </div>
            <p className="text-3xl font-extrabold">{stats ? stats.overdueInstallments : overdue.length}</p>
            <p className="text-sm text-muted-foreground">cuotas vencidas · {money(moraMonto)} por recuperar</p>
            <div className="mt-auto flex flex-col gap-2 pt-4">
              <Button asChild variant={overdue.length > 0 ? 'destructive' : 'outline'} className="w-full">
                <Link href="/dashboard/cobro"><BellRing className="h-4 w-4" /> Gestionar vencidas</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/dashboard/recordatorios">Enviar recordatorios</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recaudo 7 días + desglose de hoy */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <p className="mb-4 font-extrabold">Recaudo — últimos 7 días</p>
            {chart.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Sin datos aún.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} />
                  <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={44} tick={{ fill: INK_MUTED, fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v: number) => [money(v), 'Recaudo']} contentStyle={{ borderRadius: 12, border: `2px solid ${GRID}`, fontSize: 13 }} />
                  <Bar dataKey="amount" fill={ACCENT} radius={[8, 8, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 font-extrabold">Recaudo de hoy · desglose</p>
            <div className="space-y-1">
              <BreakdownRow icon={<Banknote className="h-4 w-4" />} label="Capital" value={money(summary?.collectedCapital ?? 0)} />
              <BreakdownRow icon={<Percent className="h-4 w-4" />} label="Interés" value={money(summary?.collectedInterest ?? 0)} />
              <BreakdownRow icon={<Layers className="h-4 w-4" />} label="Cargos" value={money(summary?.collectedCharges ?? 0)} />
              <BreakdownRow icon={<AlertTriangle className="h-4 w-4" />} label="Mora" value={money(summary?.collectedLateFee ?? 0)} />
              <div className="my-2 border-t border-border" />
              <BreakdownRow icon={<HandCoins className="h-4 w-4" />} label="Colocado hoy" value={money(summary?.disbursedTotal ?? 0)} />
              <BreakdownRow icon={<Receipt className="h-4 w-4" />} label="Gastos" value={`-${money(summary?.expensesTotal ?? 0)}`} danger />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Ranking de cobradores + últimos abonos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <p className="font-extrabold">Ranking de cobradores</p>
            </div>
            {topCollectors.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay recaudo registrado.</p>
            ) : (
              <div className="space-y-3">
                {topCollectors.map((c, i) => (
                  <div key={c.collectorId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className={`flex size-6 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                        {c.collectorName ?? 'Sin nombre'}
                      </span>
                      <span className="text-muted-foreground">{money(c.collected)} · {c.payments} pago{c.payments === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((c.collected / maxCollected) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-extrabold">Últimos abonos</p>
              <Link href="/dashboard/pagos" className="text-xs font-bold text-primary hover:underline">Ver todos</Link>
            </div>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin abonos recientes.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payments.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.clientName ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.collectorName ?? '—'} · {formatDate(p.paidAt)}</p>
                    </div>
                    <span className="shrink-0 font-bold text-emerald-600">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Cartera por estado */}
      {stats && stats.portfolioByStatus.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-semibold text-muted-foreground">Cartera por estado</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.portfolioByStatus.map((s) => (
              <Card key={s.status}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{STATUS_LABEL[s.status] ?? s.status}</Badge>
                    <span className="text-lg font-extrabold">{s.count}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{money(s.balance)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Accesos rápidos */}
      <section>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Accesos rápidos</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/dashboard/cobro" icon={<CalendarCheck className="h-5 w-5" />} label="Cobro del día" desc="Cuotas por cobrar hoy" />
          <QuickLink href="/dashboard/prestamos" icon={<HandCoins className="h-5 w-5" />} label="Préstamos" desc="Cartera y nuevos créditos" />
          <QuickLink href="/dashboard/clientes" icon={<Users className="h-5 w-5" />} label="Clientes" desc="Directorio de deudores" />
          <QuickLink href="/dashboard/caja" icon={<Coins className="h-5 w-5" />} label="Caja" desc="Abrir / cerrar arqueo" />
        </div>
      </section>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 text-center">
      <p className="truncate text-sm font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function BreakdownRow({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>{label}
      </span>
      <span className={`text-sm font-bold ${danger ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="font-extrabold leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
