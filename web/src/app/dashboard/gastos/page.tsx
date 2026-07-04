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
import { createExpense, deleteExpense, fetchExpenses, fetchFinancialSummary, type Expense, type FinancialSummary } from '@/lib/graphql';
import { formatDate, money } from '@/lib/utils';
import { Plus, Receipt, Trash2, TrendingUp, Wallet } from 'lucide-react';

const CATEGORIES = ['Transporte', 'Oficina', 'Sueldos', 'Servicios', 'Otro'];

export default function GastosPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  const load = useCallback(() => {
    fetchExpenses().then((d) => setItems(d.expenses)).catch((e) => toast.error(e.message));
    fetchFinancialSummary().then((d) => setSummary(d.financialSummary)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const columns: Column<Expense>[] = [
    { key: 'category', header: 'Categoría', sortable: true, sortValue: (e) => e.category, render: (e) => <span className="font-medium">{e.category}</span> },
    { key: 'note', header: 'Nota', render: (e) => <span className="text-muted-foreground">{e.note ?? '—'}</span> },
    { key: 'authorName', header: 'Registró', render: (e) => <span className="text-muted-foreground">{e.authorName}</span> },
    { key: 'createdAt', header: 'Fecha', sortable: true, sortValue: (e) => e.createdAt, render: (e) => formatDate(e.createdAt) },
    { key: 'amount', header: 'Monto', className: 'text-right', sortable: true, sortValue: (e) => e.amount, render: (e) => <span className="font-semibold text-destructive">-{money(e.amount)}</span> },
  ];

  const rowActions = (e: Expense): RowAction<Expense>[] => [
    { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setToDelete(e) },
  ];

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteExpense(toDelete.id);
      toast.success('Gasto eliminado');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      throw err;
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Gastos"
        description="Egresos operativos del negocio (transporte, oficina, sueldos, servicios…). Se descuentan de la ganancia neta del período."
        actions={<NewExpenseSheet open={open} setOpen={setOpen} onCreated={load} />}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={<Receipt className="h-4 w-4" />} label="Gastos (hoy)" value={money(summary?.expensesTotal ?? 0)} tone="destructive" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Ganancia neta (hoy)" value={money(summary?.netProfit ?? 0)} tone="primary" />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Recaudado (hoy)" value={money(summary?.totalCollected ?? 0)} />
      </section>

      <DataTable
        rows={items}
        columns={columns}
        rowActions={rowActions}
        search={(e) => `${e.category} ${e.note ?? ''} ${e.authorName}`}
        searchPlaceholder="Buscar gasto…"
        empty="Aún no hay gastos registrados."
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar gasto"
        description={`Se eliminará el gasto de ${toDelete ? money(toDelete.amount) : ''} (${toDelete?.category ?? ''}).`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'destructive' | 'primary' }) {
  const cls = tone === 'destructive' ? 'bg-destructive/10 text-destructive' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
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

function NewExpenseSheet({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const [category, setCategory] = useState('Transporte');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createExpense({ category, amount, note: note.trim() || undefined });
      toast.success('Gasto registrado');
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
          <Plus className="h-4 w-4" /> Nuevo gasto
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Nuevo gasto
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto</Label>
            <CurrencyInput value={amount} onValueChange={setAmount} />
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalle del gasto" />
          </div>
          <Button type="submit" className="w-full" disabled={saving || amount <= 0}>
            Registrar gasto
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
