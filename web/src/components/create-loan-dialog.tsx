'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createLoan, fetchClients, fetchRoutes, type Client, type Route } from '@/lib/graphql';
import { money } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';

type Freq = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
const FREQS: { key: Freq; label: string; days: number }[] = [
  { key: 'DAILY', label: 'Diario', days: 1 },
  { key: 'WEEKLY', label: 'Semanal', days: 7 },
  { key: 'BIWEEKLY', label: 'Quincenal', days: 15 },
  { key: 'MONTHLY', label: 'Mensual', days: 30 },
];

function durationLabel(termCount: number, freq: Freq): string {
  const days = (FREQS.find((f) => f.key === freq)?.days ?? 1) * termCount;
  const parts = [`${days.toLocaleString('es-CO')} días`];
  if (days >= 7) parts.push(`${(days / 7).toFixed(days % 7 === 0 ? 0 : 1)} sem`);
  if (days >= 30) parts.push(`${(days / 30).toFixed(days % 30 === 0 ? 0 : 1)} meses`);
  if (days >= 365) parts.push(`${(days / 365).toFixed(1)} años`);
  return parts.join(' · ');
}

export function CreateLoanDialog({ onCreated, clientId: fixedClient }: { onCreated: () => void; clientId?: string }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clientId, setClientId] = useState(fixedClient ?? '');
  const [routeId, setRouteId] = useState('none');
  const [principal, setPrincipal] = useState(100000);
  const [termCount, setTermCount] = useState(20);
  const [interestPct, setInterestPct] = useState(20);
  const [moraPct, setMoraPct] = useState(0);
  const [freq, setFreq] = useState<Freq>('DAILY');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchClients(), fetchRoutes()])
      .then(([c, r]) => {
        setClients(c.clients);
        setRoutes(r.routes);
        if (!fixedClient) setClientId((v) => v || c.clients[0]?.id || '');
      })
      .catch((e) => toast.error(e.message));
  }, [open, fixedClient]);

  const summary = useMemo(() => {
    const interestTotal = Math.round(principal * (interestPct / 100));
    const totalDue = principal + interestTotal;
    const cuota = termCount > 0 ? Math.round(totalDue / termCount) : 0;
    return { interestTotal, totalDue, cuota };
  }, [principal, interestPct, termCount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createLoan({
        clientId,
        principal,
        termCount,
        interestRate: interestPct / 100,
        interestMethod: 'FLAT',
        rateBasis: 'PER_LOAN',
        frequency: freq,
        lateFeeType: moraPct > 0 ? 'PERCENT_OF_INSTALLMENT' : 'NONE',
        lateFeeValue: moraPct > 0 ? moraPct / 100 : 0,
        routeId: routeId !== 'none' ? routeId : undefined,
      });
      toast.success('Crédito creado');
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear crédito');
    } finally {
      setLoading(false);
    }
  }

  const valid = !!clientId && principal > 0 && termCount >= 1;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo crédito
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo crédito</SheetTitle>
          <SheetDescription>Define los términos del crédito: monto, cuotas, interés y mora.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {!fixedClient && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Elige un cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}{c.documentId ? ` · ${c.documentId}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>1. Monto del préstamo</Label>
            <CurrencyInput value={principal} onValueChange={setPrincipal} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>2. Cantidad de cuotas</Label>
              <Input type="number" min={1} value={termCount} onChange={(e) => setTermCount(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as Freq)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>3. Interés (%)</Label>
              <Input type="number" min={0} step="0.1" value={interestPct} onChange={(e) => setInterestPct(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>4. Mora por cuota (%)</Label>
              <Input type="number" min={0} step="0.1" value={moraPct} onChange={(e) => setMoraPct(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ruta (opcional)</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin ruta</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resumen del crédito */}
          <div className="space-y-2 rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
            <p className="text-sm font-bold">Resumen del crédito</p>
            <SumRow label="Capital a prestar" value={money(principal)} />
            <SumRow label={`Interés (${interestPct}%)`} value={money(summary.interestTotal)} />
            <SumRow label="Total con interés" value={money(summary.totalDue)} strong />
            <div className="my-1 border-t border-border" />
            <SumRow label={`Valor de cuota (${termCount})`} value={money(summary.cuota)} />
            <SumRow label="Duración" value={durationLabel(termCount, freq)} muted />
            {moraPct > 0 ? <SumRow label="Mora por cuota" value={`${moraPct}%`} muted /> : null}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !valid}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear crédito
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SumRow({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={muted ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>{label}</span>
      <span className={strong ? 'text-base font-extrabold text-primary' : muted ? 'text-xs font-semibold' : 'text-sm font-bold'}>{value}</span>
    </div>
  );
}
