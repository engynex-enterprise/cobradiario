'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { fetchDashboardStats, type DashboardStats } from '@/lib/graphql';
import { money } from '@/lib/utils';
import {
  Wallet,
  TrendingUp,
  Landmark,
  AlertTriangle,
  CalendarCheck,
  Users,
  HandCoins,
  Coins,
} from 'lucide-react';

export default function InicioPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then((d) => setStats(d.dashboardStats))
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title={`Hola, ${user?.fullName?.split(' ')[0] ?? ''} 👋`}
        description="Resumen de tu operación de cobro diario: cartera, recaudo del día, créditos activos y en mora, con accesos rápidos a lo más usado."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Cartera pendiente" value={stats ? money(stats.totalPortfolio) : '—'} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Recaudado hoy" value={stats ? money(stats.collectedToday) : '—'} />
        <Kpi icon={<Landmark className="h-4 w-4" />} label="Créditos activos" value={stats ? String(stats.activeLoans) : '—'} />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Cuotas en mora"
          value={stats ? String(stats.overdueInstallments) : '—'}
          alert={!!stats && stats.overdueInstallments > 0}
        />
      </section>

      <div>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Accesos rápidos</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/dashboard/cobro" icon={<CalendarCheck className="h-5 w-5" />} label="Cobro del día" desc="Cuotas por cobrar hoy" />
          <QuickLink href="/dashboard/prestamos" icon={<HandCoins className="h-5 w-5" />} label="Préstamos" desc="Cartera y nuevos créditos" />
          <QuickLink href="/dashboard/clientes" icon={<Users className="h-5 w-5" />} label="Clientes" desc="Directorio de deudores" />
          <QuickLink href="/dashboard/caja" icon={<Coins className="h-5 w-5" />} label="Caja" desc="Abrir / cerrar arqueo" />
        </div>
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
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`flex h-10 w-10 items-center justify-center ${alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
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

function QuickLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="font-semibold leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
