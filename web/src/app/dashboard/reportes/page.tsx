'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchDashboardStats, type DashboardStats } from '@/lib/graphql';
import { money } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft, Wallet, TrendingUp, Landmark, AlertTriangle } from 'lucide-react';

// Azul de marca Altipal (chart-1). Validado ≥3:1 sobre superficie clara (skill dataviz).
const ACCENT = '#004f9f';
const INK_MUTED = '#5a7088';
const GRID = '#e2eaf3';

const compact = (n: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(iso + 'T00:00:00Z'));

export default function ReportesPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then((d) => setStats(d.dashboardStats))
      .catch((e) => toast.error(e.message));
  }, []);

  if (!stats) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  const collection = stats.collectionLast7Days.map((d) => ({ label: dayLabel(d.date), amount: d.amount }));
  const byStatus = stats.portfolioByStatus.map((s) => ({ label: s.status, count: s.count, balance: s.balance }));

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/dashboard')}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>
      <div className="mb-6">
        <PageHeader
          title="Reportes"
          description="Indicadores de tu operación: cartera pendiente, recaudo del día, créditos activos y en mora, cartera por estado y recaudo de los últimos 7 días."
        />
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Cartera pendiente" value={money(stats.totalPortfolio)} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Recaudado hoy" value={money(stats.collectedToday)} />
        <Kpi icon={<Landmark className="h-4 w-4" />} label="Créditos activos" value={String(stats.activeLoans)} />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Cuotas en mora"
          value={String(stats.overdueInstallments)}
          alert={stats.overdueInstallments > 0}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recaudo — últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={collection} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} />
                <YAxis
                  tickFormatter={compact}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: INK_MUTED, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(v: number) => [money(v), 'Recaudo']}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 }}
                />
                <Bar dataKey="amount" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cartera por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={byStatus}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tick={{ fill: INK_MUTED, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(v: number, _n, p) => [`${v} créditos · ${money(p.payload.balance)}`, 'Estado']}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 }}
                />
                <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={ACCENT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
