'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { fetchBalances, type Balances } from '@/lib/graphql';
import { money } from '@/lib/utils';
import { ArrowLeft, Banknote, HandCoins, PiggyBank, Wallet } from 'lucide-react';

export default function BalancesPage() {
  const router = useRouter();
  const [data, setData] = useState<Balances | null>(null);

  useEffect(() => {
    fetchBalances()
      .then((d) => setData(d.balances))
      .catch((e) => toast.error(e.message));
  }, []);

  if (!data) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  const collectedPct = data.totalDue > 0 ? Math.round((data.totalPaid / data.totalDue) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/dashboard')}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>
      <div className="mb-6">
        <PageHeader
          title="Balances"
          description="Consolidado financiero de tu operación: capital colocado, total a cobrar, recaudado histórico y saldo pendiente. Abajo, el recaudo acumulado por cada cobrador."
        />
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Banknote className="h-4 w-4" />} label="Capital colocado" value={money(data.totalPrincipal)} />
        <Kpi icon={<HandCoins className="h-4 w-4" />} label="Total a cobrar" value={money(data.totalDue)} />
        <Kpi icon={<PiggyBank className="h-4 w-4" />} label="Recaudado histórico" value={money(data.totalPaid)} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Saldo por cobrar" value={money(data.outstanding)} alert={data.outstanding > 0} />
      </section>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Avance de recaudo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{money(data.totalPaid)} de {money(data.totalDue)}</span>
            <span className="font-semibold">{collectedPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(collectedPct, 100)}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recaudo por cobrador</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byCollector.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
          ) : (
            <div className="space-y-3">
              {data.byCollector.map((c) => {
                const max = data.byCollector[0]?.collected || 1;
                const pct = Math.round((c.collected / max) * 100);
                return (
                  <div key={c.collectorId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{c.collectorName ?? 'Sin nombre'}</span>
                      <span className="text-muted-foreground">
                        {money(c.collected)} · {c.payments} pago{c.payments === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
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
