'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient, fetchClients, type Client } from '@/lib/graphql';
import { Plus, UserRound } from 'lucide-react';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetchClients()
      .then((d) => setClients(d.clients))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <NewClientDialog open={open} setOpen={setOpen} onCreated={load} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{clients.length} cliente(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aún no hay clientes. Crea el primero.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Ciudad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{c.documentId ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.city ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewClientDialog({
  open,
  setOpen,
  onCreated,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ fullName: '', documentId: '', phone: '', address: '', city: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createClient({
        fullName: form.fullName,
        documentId: form.documentId || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
      });
      toast.success('Cliente creado');
      setForm({ fullName: '', documentId: '', phone: '', address: '', city: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" /> Nuevo cliente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Documento</Label>
              <Input value={form.documentId} onChange={set('documentId')} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={set('city')} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving || !form.fullName}>
            Crear cliente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
