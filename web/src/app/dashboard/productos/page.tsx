'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createCreditProduct, fetchProducts, type Product } from '@/lib/graphql';
import { Plus, Package } from 'lucide-react';

const METHOD_LABEL: Record<string, string> = {
  FLAT: 'Interés fijo',
  DECLINING_BALANCE: 'Saldo decreciente',
  CUSTOM: 'Personalizado',
};
const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  CUSTOM: 'Personalizado',
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(() => {
    fetchProducts()
      .then((d) => setProducts(d.creditProducts))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos de crédito</h1>
          <p className="text-sm text-muted-foreground">Plantillas de interés, plazo y mora.</p>
        </div>
        <NewProductDialog onCreated={load} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{p.name}</p>
                <Badge variant="secondary">{FREQ_LABEL[p.frequency] ?? p.frequency}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{METHOD_LABEL[p.interestMethod] ?? p.interestMethod}</p>
              <div className="flex gap-4 pt-1 text-sm">
                <span className="font-semibold text-primary">{Math.round(p.interestRate * 100)}% interés</span>
                <span className="text-muted-foreground">{p.termCount} cuotas</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Aún no hay productos.</p>
        )}
      </div>
    </div>
  );
}

function NewProductDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: '',
    interestMethod: 'FLAT',
    interestRate: '20',
    rateBasis: 'PER_LOAN',
    frequency: 'DAILY',
    termCount: '20',
    graceDays: '0',
    lateFeeType: 'NONE',
    lateFeeValue: '0',
    roundTo: '100',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createCreditProduct({
        name: f.name,
        interestMethod: f.interestMethod,
        interestRate: Number(f.interestRate) / 100,
        rateBasis: f.rateBasis,
        frequency: f.frequency,
        termCount: Number(f.termCount),
        graceDays: Number(f.graceDays),
        lateFeeType: f.lateFeeType,
        lateFeeValue: f.lateFeeType.includes('PERCENT') ? Number(f.lateFeeValue) / 100 : Number(f.lateFeeValue),
        roundTo: Number(f.roundTo),
      });
      toast.success('Producto creado');
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const Select = ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: [string, string][];
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Nuevo producto de crédito
          </DialogTitle>
          <DialogDescription>Configura interés, frecuencia, plazo y mora.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="Diario 20% / 20 cuotas" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Método" value={f.interestMethod} onChange={(v) => setF({ ...f, interestMethod: v })} options={[['FLAT', 'Interés fijo'], ['DECLINING_BALANCE', 'Saldo decreciente'], ['CUSTOM', 'Personalizado']]} />
            <div className="space-y-2">
              <Label>Interés (%)</Label>
              <Input type="number" value={f.interestRate} onChange={(e) => setF({ ...f, interestRate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Base de tasa" value={f.rateBasis} onChange={(v) => setF({ ...f, rateBasis: v })} options={[['PER_LOAN', 'Por crédito'], ['PER_PERIOD', 'Por período'], ['ANNUAL', 'Anual']]} />
            <Select label="Frecuencia" value={f.frequency} onChange={(v) => setF({ ...f, frequency: v })} options={[['DAILY', 'Diario'], ['WEEKLY', 'Semanal'], ['BIWEEKLY', 'Quincenal'], ['MONTHLY', 'Mensual']]} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Cuotas</Label>
              <Input type="number" value={f.termCount} onChange={(e) => setF({ ...f, termCount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gracia (días)</Label>
              <Input type="number" value={f.graceDays} onChange={(e) => setF({ ...f, graceDays: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Redondeo</Label>
              <Input type="number" value={f.roundTo} onChange={(e) => setF({ ...f, roundTo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Mora" value={f.lateFeeType} onChange={(v) => setF({ ...f, lateFeeType: v })} options={[['NONE', 'Sin mora'], ['FIXED', 'Fija'], ['PERCENT_OF_INSTALLMENT', '% de la cuota'], ['PERCENT_OF_BALANCE', '% del saldo'], ['DAILY_PERCENT', '% diario']]} />
            <div className="space-y-2">
              <Label>Valor mora</Label>
              <Input type="number" value={f.lateFeeValue} onChange={(e) => setF({ ...f, lateFeeValue: e.target.value })} disabled={f.lateFeeType === 'NONE'} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving || !f.name}>
            Crear producto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
