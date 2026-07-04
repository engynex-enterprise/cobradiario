'use client';

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createLoan,
  fetchClients,
  fetchProducts,
  fetchRoutes,
  type Client,
  type Product,
  type Route,
} from '@/lib/graphql';
import { Loader2, Plus } from 'lucide-react';

export function CreateLoanDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [routeId, setRouteId] = useState('none');
  const [principal, setPrincipal] = useState('100000');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchClients(), fetchProducts(), fetchRoutes()])
      .then(([c, p, r]) => {
        setClients(c.clients);
        setProducts(p.creditProducts);
        setRoutes(r.routes);
        setClientId((v) => v || c.clients[0]?.id || '');
        setProductId((v) => v || p.creditProducts[0]?.id || '');
      })
      .catch((e) => toast.error(e.message));
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createLoan({
        clientId,
        productId,
        principal: Number(principal),
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
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nuevo crédito</SheetTitle>
          <SheetDescription>El plan de cuotas se calcula con el producto elegido.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Elige un cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                    {c.documentId ? ` · ${c.documentId}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Producto de crédito</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Elige un producto" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({Math.round(p.interestRate * 100)}% · {p.termCount} cuotas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="space-y-2">
            <Label>Monto (capital)</Label>
            <Input type="number" min={1} value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !clientId || !productId}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear crédito
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
