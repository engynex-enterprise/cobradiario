'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { registerPayment, type Loan } from '@/lib/graphql';
import { money } from '@/lib/utils';
import { Loader2, Wallet } from 'lucide-react';

export function PayDialog({ loan, onPaid }: { loan: Loan; onPaid: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // clientRequestId = idempotencia (evita doble cobro ante doble clic / reintento).
      const clientRequestId = `${loan.id}-${Date.now()}`;
      const { registerPayment: r } = await registerPayment({
        loanId: loan.id,
        amount,
        clientRequestId,
      });
      toast.success(`Abono aplicado: ${money(r.applied)}`, {
        description: `Saldo restante: ${money(r.loan.balance)}`,
      });
      setOpen(false);
      setAmount(0);
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar abono');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={loan.status === 'PAID'}>
          <Wallet className="h-4 w-4" /> Abonar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            Saldo actual: <span className="font-semibold text-foreground">{money(loan.balance)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto del abono</Label>
            <CurrencyInput value={amount} onValueChange={setAmount} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={loading || amount <= 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar abono
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
