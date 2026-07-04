'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { createBaseMovement, deleteBaseMovement, fetchBaseMovements, type BaseMovement } from '@/lib/graphql';
import { formatDate, money } from '@/lib/utils';
import { LogIn, LogOut, Plus, Trash2 } from 'lucide-react';

export default function BasesPage() {
  const [items, setItems] = useState<BaseMovement[]>([]);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BaseMovement | null>(null);

  const load = useCallback(() => {
    fetchBaseMovements().then((d) => setItems(d.baseMovements)).catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  const rowActions = (b: BaseMovement): RowAction<BaseMovement>[] => [
    { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setToDelete(b) },
  ];

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteBaseMovement(toDelete.id);
      toast.success('Movimiento eliminado');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      throw err;
    }
  }

  const recibido = items.filter((b) => b.type === 'RECEIVED').reduce((s, b) => s + b.amount, 0);
  const entregado = items.filter((b) => b.type === 'DELIVERED').reduce((s, b) => s + b.amount, 0);

  const columns: Column<BaseMovement>[] = [
    { key: 'type', header: 'Tipo', sortable: true, sortValue: (b) => b.type, render: (b) => (b.type === 'RECEIVED' ? <span className="font-medium text-emerald-600">Recibida</span> : <span className="font-medium text-sky-600">Entregada</span>) },
    { key: 'note', header: 'Nota', render: (b) => <span className="text-muted-foreground">{b.note ?? '—'}</span> },
    { key: 'authorName', header: 'Registró', render: (b) => <span className="text-muted-foreground">{b.authorName}</span> },
    { key: 'createdAt', header: 'Fecha', sortable: true, sortValue: (b) => b.createdAt, render: (b) => formatDate(b.createdAt) },
    { key: 'amount', header: 'Monto', className: 'text-right', sortable: true, sortValue: (b) => b.amount, render: (b) => <span className="font-semibold">{money(b.amount)}</span> },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Bases"
        description="Efectivo que el cobrador recibe para prestar/dar cambio y el que entrega al cierre. Alimenta las líneas de Bases del resumen financiero."
        actions={<NewBaseSheet open={open} setOpen={setOpen} onCreated={load} />}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Kpi icon={<LogIn className="h-4 w-4" />} label="Total recibido" value={money(recibido)} tone="primary" />
        <Kpi icon={<LogOut className="h-4 w-4" />} label="Total entregado" value={money(entregado)} tone="accent" />
      </section>

      <DataTable
        rows={items}
        columns={columns}
        rowActions={rowActions}
        search={(b) => `${b.type} ${b.note ?? ''} ${b.authorName}`}
        searchPlaceholder="Buscar base…"
        empty="Aún no hay movimientos de base."
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar movimiento"
        description={`Se eliminará la base ${toDelete?.type === 'RECEIVED' ? 'recibida' : 'entregada'} de ${toDelete ? money(toDelete.amount) : ''}.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'accent' }) {
  const cls = tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cls}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NewBaseSheet({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const [type, setType] = useState('RECEIVED');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createBaseMovement({ type, amount, note: note.trim() || undefined });
      toast.success('Base registrada');
      setAmount(0);
      setNote('');
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
          <Plus className="h-4 w-4" /> Nueva base
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nueva base</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEIVED">Base recibida</SelectItem>
                <SelectItem value="DELIVERED">Base entregada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto</Label>
            <CurrencyInput value={amount} onValueChange={setAmount} />
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalle" />
          </div>
          <Button type="submit" className="w-full" disabled={saving || amount <= 0}>
            Registrar base
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
