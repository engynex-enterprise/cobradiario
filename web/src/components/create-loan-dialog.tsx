'use client';

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createLoan, fetchClients, fetchProducts, type Client, type Product } from '@/lib/graphql';
import { Loader2, Plus } from 'lucide-react';

export function CreateLoanDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [principal, setPrincipal] = useState('100000');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchClients(), fetchProducts()])
      .then(([c, p]) => {
        setClients(c.clients);
        setProducts(p.creditProducts);
        setClientId((v) => v || c.clients[0]?.id || '');
        setProductId((v) => v || p.creditProducts[0]?.id || '');
      })
      .catch((e) => toast.error(e.message));
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createLoan({ clientId, productId, principal: Number(principal) });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo crédito
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo crédito</DialogTitle>
          <DialogDescription>El plan de cuotas se calcula con el producto elegido.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <select
              id="client"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} {c.documentId ? `· ${c.documentId}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">Producto de crédito</Label>
            <select
              id="product"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({Math.round(p.interestRate * 100)}% · {p.termCount} cuotas)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="principal">Monto (capital)</Label>
            <Input
              id="principal"
              type="number"
              min={1}
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !clientId || !productId}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear crédito
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
