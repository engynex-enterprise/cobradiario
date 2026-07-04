'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Productos de crédito"
        description="Plantillas configurables de interés, plazo y mora. Al crear un crédito eliges un producto y sus términos se aplican y quedan congelados en ese crédito."
        actions={<NewProductDrawer onCreated={load} />}
      />

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NewProductDrawer({ onCreated }: { onCreated: () => void }) {
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
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Nuevo producto
          </SheetTitle>
          <SheetDescription>Configura interés, frecuencia, plazo y mora.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nombre">
            <Input value={f.name} onChange={(e) => set('name', e.target.value)} required placeholder="Diario 20% / 20 cuotas" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Método">
              <Select value={f.interestMethod} onValueChange={(v) => set('interestMethod', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">Interés fijo</SelectItem>
                  <SelectItem value="DECLINING_BALANCE">Saldo decreciente</SelectItem>
                  <SelectItem value="CUSTOM">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interés (%)">
              <Input type="number" value={f.interestRate} onChange={(e) => set('interestRate', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Base de tasa">
              <Select value={f.rateBasis} onValueChange={(v) => set('rateBasis', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_LOAN">Por crédito</SelectItem>
                  <SelectItem value="PER_PERIOD">Por período</SelectItem>
                  <SelectItem value="ANNUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Frecuencia">
              <Select value={f.frequency} onValueChange={(v) => set('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Diario</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Cuotas">
              <Input type="number" value={f.termCount} onChange={(e) => set('termCount', e.target.value)} />
            </Field>
            <Field label="Gracia (días)">
              <Input type="number" value={f.graceDays} onChange={(e) => set('graceDays', e.target.value)} />
            </Field>
            <Field label="Redondeo">
              <Input type="number" value={f.roundTo} onChange={(e) => set('roundTo', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mora">
              <Select value={f.lateFeeType} onValueChange={(v) => set('lateFeeType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin mora</SelectItem>
                  <SelectItem value="FIXED">Fija</SelectItem>
                  <SelectItem value="PERCENT_OF_INSTALLMENT">% de la cuota</SelectItem>
                  <SelectItem value="PERCENT_OF_BALANCE">% del saldo</SelectItem>
                  <SelectItem value="DAILY_PERCENT">% diario</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor mora">
              <Input type="number" value={f.lateFeeValue} onChange={(e) => set('lateFeeValue', e.target.value)} disabled={f.lateFeeType === 'NONE'} />
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={saving || !f.name}>
            Crear producto
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
