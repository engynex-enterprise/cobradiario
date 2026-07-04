'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  addCashMovement,
  closeCashBox,
  fetchOpenCashBox,
  openCashBox,
  type CashBox,
} from '@/lib/graphql';
import { formatDate, money } from '@/lib/utils';

const MOVEMENT_TYPES = ['EXPENSE', 'DISBURSEMENT', 'DEPOSIT', 'ADJUSTMENT'] as const;

export default function CajaPage() {
  const [box, setBox] = useState<CashBox | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    fetchOpenCashBox()
      .then((d) => setBox(d.myOpenCashBox))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpen(amount: number) {
    try {
      const d = await openCashBox(amount);
      setBox(d.openCashBox);
      toast.success('Caja abierta');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function handleAdd(type: string, amount: number, note: string) {
    try {
      const d = await addCashMovement(type, amount, note || undefined);
      setBox(d.addCashMovement);
      toast.success('Movimiento registrado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function handleClose(counted: number) {
    try {
      const d = await closeCashBox(counted);
      const diff = d.closeCashBox.difference ?? 0;
      toast.success('Caja cerrada', {
        description: diff === 0 ? 'Cuadre exacto' : `Descuadre: ${money(diff)}`,
      });
      setBox(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Caja del día"
        description="Arqueo del efectivo del cobrador: abre la caja con un saldo base, registra gastos y consignaciones, y ciérrala contando el efectivo para detectar descuadres."
      />

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : box ? (
        <OpenBox box={box} onAdd={handleAdd} onClose={handleClose} />
      ) : (
        <OpenForm onOpen={handleOpen} />
      )}
    </div>
  );
}

function OpenForm({ onOpen }: { onOpen: (amount: number) => void }) {
  const [amount, setAmount] = useState(50000);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Abrir caja</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onOpen(amount);
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="opening">Saldo inicial (base)</Label>
            <CurrencyInput value={amount} onValueChange={setAmount} />
          </div>
          <Button type="submit">Abrir</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OpenBox({
  box,
  onAdd,
  onClose,
}: {
  box: CashBox;
  onAdd: (type: string, amount: number, note: string) => void;
  onClose: (counted: number) => void;
}) {
  const [type, setType] = useState<string>('EXPENSE');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [counted, setCounted] = useState<number | undefined>(undefined);
  const preview = counted !== undefined ? counted - box.expectedBalance : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Saldo inicial" value={money(box.openingBalance)} />
        <Stat label="Recaudado (cobros)" value={money(box.collectionsTotal)} />
        <Stat label="Saldo esperado" value={money(box.expectedBalance)} highlight />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {box.movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Badge variant={m.type === 'COLLECTION' ? 'success' : 'secondary'}>{m.type}</Badge>
                  </TableCell>
                  <TableCell>{money(m.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{m.note}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agregar movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!amount) return;
              onAdd(type, amount, note);
              setAmount(0);
              setNote('');
            }}
          >
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-2">
              <Label>Monto</Label>
              <CurrencyInput value={amount} onValueChange={setAmount} />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Nota</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" />
            </div>
            <Button type="submit" variant="secondary">
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cerrar caja (arqueo)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (counted === undefined) return;
              onClose(counted);
            }}
          >
            <div className="w-44 space-y-2">
              <Label>Efectivo contado</Label>
              <CurrencyInput value={counted} onValueChange={setCounted} />
            </div>
            {preview !== null && (
              <p className={`pb-2 text-sm ${preview === 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {preview === 0 ? 'Cuadre exacto' : `Descuadre: ${money(preview)}`}
              </p>
            )}
            <Button type="submit" variant="destructive" className="ml-auto">
              Cerrar caja
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
