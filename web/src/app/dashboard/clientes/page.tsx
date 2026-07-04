'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { createClient, deleteClient, fetchClients, updateClient, type Client } from '@/lib/graphql';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const load = useCallback(() => {
    fetchClients()
      .then((d) => setClients(d.clients))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  const columns: Column<Client>[] = [
    { key: 'fullName', header: 'Nombre', sortable: true, sortValue: (c) => c.fullName, render: (c) => <span className="font-medium">{c.fullName}</span> },
    { key: 'documentId', header: 'Documento', render: (c) => <span className="text-muted-foreground">{c.documentId ?? '—'}</span> },
    { key: 'phone', header: 'Teléfono', render: (c) => <span className="text-muted-foreground">{c.phone ?? '—'}</span> },
    { key: 'city', header: 'Ciudad', sortable: true, sortValue: (c) => c.city ?? '', render: (c) => <span className="text-muted-foreground">{c.city ?? '—'}</span> },
  ];

  const rowActions = (c: Client): RowAction<Client>[] => [
    { label: 'Editar', icon: Pencil, onClick: () => setEditing(c) },
    { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setToDelete(c) },
  ];

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteClient(toDelete.id);
      toast.success('Cliente eliminado');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      throw err;
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Clientes"
        description="Directorio de deudores. Registra a cada persona a la que le prestas: sus datos de contacto y ubicación se usan al crear créditos y en las rutas de cobro."
        actions={<ClientDrawer open={open} setOpen={setOpen} onSaved={load} />}
      />
      <DataTable
        rows={clients}
        columns={columns}
        rowActions={rowActions}
        search={(c) => `${c.fullName} ${c.documentId ?? ''} ${c.city ?? ''}`}
        searchPlaceholder="Buscar cliente…"
        empty="Aún no hay clientes. Crea el primero."
      />

      <ClientDrawer
        open={editing !== null}
        setOpen={(v) => !v && setEditing(null)}
        client={editing ?? undefined}
        onSaved={load}
        hideTrigger
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar cliente"
        description={`Se archivará a "${toDelete?.fullName ?? ''}". No podrás eliminarlo si tiene créditos activos.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ClientDrawer({
  open,
  setOpen,
  onSaved,
  client,
  hideTrigger,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSaved: () => void;
  client?: Client;
  hideTrigger?: boolean;
}) {
  const isEdit = !!client;
  const [form, setForm] = useState({ fullName: '', documentId: '', phone: '', address: '', city: '' });
  const [saving, setSaving] = useState(false);

  // Precargar al abrir en modo edición.
  useEffect(() => {
    if (open && client) {
      setForm({
        fullName: client.fullName ?? '',
        documentId: client.documentId ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
      });
    } else if (open && !client) {
      setForm({ fullName: '', documentId: '', phone: '', address: '', city: '' });
    }
  }, [open, client]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        documentId: form.documentId || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
      };
      if (isEdit) {
        await updateClient({ id: client!.id, ...payload });
        toast.success('Cliente actualizado');
      } else {
        await createClient(payload);
        toast.success('Cliente creado');
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" /> {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </SheetTitle>
        </SheetHeader>
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
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
