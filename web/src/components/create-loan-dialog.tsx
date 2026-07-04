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
import { createLoan, fetchClients, fetchProducts, fetchRoutes, type Client, type Product, type Route } from '@/lib/graphql';
import { money } from '@/lib/utils';
import { ArrowLeftRight, Loader2, Plus } from 'lucide-react';

type Freq = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
const FREQS: { key: Freq; label: string; unit: string; days: number }[] = [
  { key: 'DAILY', label: 'Diario', unit: 'días', days: 1 },
  { key: 'WEEKLY', label: 'Semanal', unit: 'semanas', days: 7 },
  { key: 'BIWEEKLY', label: 'Quincenal', unit: 'quincenas', days: 15 },
  { key: 'MONTHLY', label: 'Mensual', unit: 'meses', days: 30 },
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
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clientId, setClientId] = useState(fixedClient ?? '');
  const [routeId, setRouteId] = useState('none');
  const [presetId, setPresetId] = useState('none');

  const [principal, setPrincipal] = useState(100000);
  const [interestPct, setInterestPct] = useState(20);
  const [moraPct, setMoraPct] = useState(0);
  const [freq, setFreq] = useState<Freq>('DAILY');

  // Bidireccional: el último campo editado manda.
  const [driver, setDriver] = useState<'count' | 'amount'>('count');
  const [termCountInput, setTermCountInput] = useState(20);
  const [cuotaInput, setCuotaInput] = useState(0);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchClients(), fetchProducts(), fetchRoutes()])
      .then(([c, p, r]) => {
        setClients(c.clients);
        setProducts(p.creditProducts);
        setRoutes(r.routes);
        if (!fixedClient) setClientId((v) => v || c.clients[0]?.id || '');
      })
      .catch((e) => toast.error(e.message));
  }, [open, fixedClient]);

  const interestTotal = Math.round(principal * (interestPct / 100));
  const totalDue = principal + interestTotal;

  const { termCount, cuota } = useMemo(() => {
    if (driver === 'count') {
      const n = Math.max(1, Math.round(termCountInput || 0));
      return { termCount: n, cuota: totalDue > 0 ? Math.round(totalDue / n) : 0 };
    }
    const c = Math.max(1, Math.round(cuotaInput || 0));
    return { termCount: totalDue > 0 && c > 0 ? Math.max(1, Math.round(totalDue / c)) : 0, cuota: c };
  }, [driver, termCountInput, cuotaInput, totalDue]);

  function applyPreset(id: string) {
    setPresetId(id);
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setInterestPct(Math.round(p.interestRate * 100 * 100) / 100);
    if (p.lateFeeValue != null && (p.lateFeeType === 'PERCENT_OF_INSTALLMENT' || p.lateFeeType === 'PERCENT_OF_BALANCE')) {
      setMoraPct(Math.round(p.lateFeeValue * 100 * 100) / 100);
    }
    if (['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(p.frequency)) setFreq(p.frequency as Freq);
  }

  const valid = !!clientId && principal > 0 && termCount >= 1;
  const unit = FREQS.find((f) => f.key === freq)!.unit;

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
          <SheetDescription>Valor a prestar, cuotas y frecuencia. El interés y la mora pueden venir de un preset.</SheetDescription>
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

          {products.length > 0 && (
            <div className="space-y-2">
              <Label>Preset (interés y mora)</Label>
              <Select value={presetId} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue placeholder="Manual" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {Math.round(p.interestRate * 100)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>1. Valor a prestar</Label>
            <CurrencyInput value={principal} onValueChange={setPrincipal} />
          </div>

          <div className="space-y-2">
            <Label>2. Frecuencia de pago</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v as Freq)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>3. Cuotas o valor (se calculan entre sí)</Label>
            <div className="flex items-end gap-2">
              <div className={`flex-1 rounded-lg border-2 p-2 ${driver === 'count' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <p className="text-[11px] font-semibold text-muted-foreground">N.º de {unit}</p>
                <Input
                  type="number"
                  min={1}
                  className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                  value={termCount || ''}
                  onFocus={() => setDriver('count')}
                  onChange={(e) => { setDriver('count'); setTermCountInput(Number(e.target.value) || 0); }}
                />
              </div>
              <ArrowLeftRight className="mb-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className={`flex-1 rounded-lg border-2 p-2 ${driver === 'amount' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <p className="text-[11px] font-semibold text-muted-foreground">Valor de cuota</p>
                <Input
                  type="number"
                  min={1}
                  className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                  value={cuota || ''}
                  onFocus={() => setDriver('amount')}
                  onChange={(e) => { setDriver('amount'); setCuotaInput(Number(e.target.value) || 0); }}
                />
              </div>
            </div>
            <p className="text-xs text-primary">
              {driver === 'count' ? '→ El valor de cada cuota se calcula automáticamente.' : `→ El número de ${unit} se calcula automáticamente.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>4. Interés (%)</Label>
              <Input type="number" min={0} step="0.1" value={interestPct} onChange={(e) => setInterestPct(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>5. Mora por cuota (%)</Label>
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

          <div className="space-y-2 rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
            <p className="text-sm font-bold">Resumen del crédito</p>
            <SumRow label="Capital a prestar" value={money(principal)} />
            <SumRow label={`Interés (${interestPct}%)`} value={money(interestTotal)} />
            <SumRow label="Total con interés" value={money(totalDue)} strong />
            <div className="my-1 border-t border-border" />
            <SumRow label={`Valor de cuota (${termCount})`} value={money(cuota)} />
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
