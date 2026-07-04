'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchDueInstallments, type DueInstallment } from '@/lib/graphql';
import { formatDate, money } from '@/lib/utils';

type Tab = 'TODAY' | 'OVERDUE' | 'UPCOMING';
const TABS: { key: Tab; label: string }[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'OVERDUE', label: 'Vencidas' },
  { key: 'UPCOMING', label: 'Próximas' },
];

export default function CobroPage() {
  const [tab, setTab] = useState<Tab>('TODAY');
  const [items, setItems] = useState<DueInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchDueInstallments(tab)
      .then((d) => setItems(d.dueInstallments))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => load(), [load]);

  const total = items.reduce((s, i) => s + (i.amount + i.lateFee - i.paidAmount), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Cobro del día"
        description="Cuotas a gestionar en campo: las que vencen hoy, las que ya están vencidas (con mora) y las próximas a vencer. Usa las pestañas para cambiar de vista."
      />

      <div className="flex gap-1 border-b-2 border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-0.5 border-b-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {tab === 'OVERDUE' ? 'Sin cuotas vencidas 🎉' : 'Sin cuotas en este periodo.'}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground">{items.length} cuota(s)</span>
                <span className="font-semibold">Por cobrar: {money(total)}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Cuota #</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Mora</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.clientName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{it.routeName ?? '—'}</TableCell>
                      <TableCell>{it.sequence}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(it.dueDate)}</TableCell>
                      <TableCell className="font-semibold">{money(it.amount)}</TableCell>
                      <TableCell className={it.lateFee > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                        {money(it.lateFee)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={it.status === 'OVERDUE' ? 'destructive' : 'secondary'}>{it.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
