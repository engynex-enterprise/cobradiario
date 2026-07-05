'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column, type RowAction } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CreateLoanDialog } from '@/components/create-loan-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { createClient, deleteClient, fetchClients, fetchLoans, updateClient, type Client, type Loan } from '@/lib/graphql';
import { money } from '@/lib/utils';
import {
  Pencil, Plus, Trash2, UserRound, HandCoins, Eye, Phone, MessageCircle, Copy,
  Users, Wallet, MapPin, Loader2,
} from 'lucide-react';

/** Normaliza un teléfono colombiano para wa.me (solo dígitos, con indicativo 57). */
function waNumber(phone: string) {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('57') ? d : `57${d}`;
}

const MODULE_INFO = {
  summary: 'El directorio de todas las personas a las que les prestas: sus datos de contacto y ubicación.',
  purpose:
    'Centraliza a tus deudores para poder crearles créditos, ubicarlos en las rutas de cobro y contactarlos rápidamente.',
  how: [
    'Los KPIs resumen tu base: total de clientes, cuántos tienen crédito activo, el saldo total en la calle y en cuántas ciudades operas.',
    'Cada fila muestra sus créditos (activos/total) y el saldo que te debe.',
    'Crea un cliente con "Nuevo cliente" (nombre, documento, teléfono, dirección y ciudad).',
    'El menú (⋮) de cada fila permite: crear un crédito nuevo, ver sus créditos, escribirle por WhatsApp, llamarlo, copiar su teléfono, editar o eliminar.',
    'Un cliente con créditos activos no se puede eliminar (se protege la cartera).',
  ],
  technical:
    'Cada Client vive aislado por tenant (RLS). La lista trae agregados por cliente (loansCount, activeLoans, totalBalance) calculados con groupBy sobre Loan. WhatsApp abre wa.me con el teléfono normalizado (indicativo 57). "Eliminar" hace un soft-delete (marca deletedAt) y valida que no tenga créditos ACTIVE/DEFAULTED antes de archivar.',
  plain:
    'Es tu agenda de contactos de negocio con memoria de cuánto te debe cada quien: "Ana Pérez, calle 10, me debe $60.000 en 1 crédito activo". Desde su menú le puedes escribir por WhatsApp, llamarla o arrancarle un crédito nuevo sin salir de la lista.',
  tips: [
    'Usa "Nuevo crédito" desde el cliente para que ya venga seleccionado.',
    'El botón de WhatsApp es la forma más rápida de recordarle un pago.',
    'Ordena por "Saldo" para ver quién concentra más deuda.',
  ],
};

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [loanFor, setLoanFor] = useState<Client | null>(null);
  const [loansOf, setLoansOf] = useState<Client | null>(null);

  const load = useCallback(() => {
    fetchClients()
      .then((d) => setClients(d.clients))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  const kpis = useMemo(() => {
    const conActivo = clients.filter((c) => (c.activeLoans ?? 0) > 0).length;
    const saldo = clients.reduce((s, c) => s + (c.totalBalance ?? 0), 0);
    const ciudades = new Set(clients.map((c) => c.city).filter(Boolean)).size;
    return { total: clients.length, conActivo, saldo, ciudades };
  }, [clients]);

  const columns: Column<Client>[] = [
    {
      key: 'fullName', header: 'Nombre', sortable: true, sortValue: (c) => c.fullName,
      render: (c) => (
        <div>
          <p className="font-semibold">{c.fullName}</p>
          {c.documentId && <p className="text-xs text-muted-foreground">Doc. {c.documentId}</p>}
        </div>
      ),
    },
    { key: 'phone', header: 'Teléfono', render: (c) => <span className="text-muted-foreground">{c.phone ?? '—'}</span> },
    { key: 'city', header: 'Ciudad', sortable: true, sortValue: (c) => c.city ?? '', render: (c) => <span className="text-muted-foreground">{c.city ?? '—'}</span> },
    {
      key: 'loans', header: 'Créditos', sortable: true, sortValue: (c) => c.activeLoans ?? 0,
      render: (c) =>
        (c.loansCount ?? 0) === 0 ? (
          <span className="text-xs text-muted-foreground">Sin créditos</span>
        ) : (
          <Badge variant={(c.activeLoans ?? 0) > 0 ? 'default' : 'secondary'}>
            {c.activeLoans ?? 0} activo{(c.activeLoans ?? 0) === 1 ? '' : 's'} · {c.loansCount} total
          </Badge>
        ),
    },
    { key: 'totalBalance', header: 'Saldo', className: 'text-right', sortable: true, sortValue: (c) => c.totalBalance ?? 0, render: (c) => <span className="font-bold">{money(c.totalBalance ?? 0)}</span> },
  ];

  const rowActions = (c: Client): RowAction<Client>[] => [
    { label: 'Nuevo crédito', icon: HandCoins, onClick: () => setLoanFor(c) },
    { label: 'Ver créditos', icon: Eye, onClick: () => setLoansOf(c), hidden: () => (c.loansCount ?? 0) === 0 },
    { label: 'WhatsApp', icon: MessageCircle, onClick: () => window.open(`https://wa.me/${waNumber(c.phone!)}`, '_blank'), hidden: () => !c.phone },
    { label: 'Llamar', icon: Phone, onClick: () => window.open(`tel:${c.phone}`), hidden: () => !c.phone },
    { label: 'Copiar teléfono', icon: Copy, onClick: () => { navigator.clipboard.writeText(c.phone!); toast.success('Teléfono copiado'); }, hidden: () => !c.phone },
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
        info={MODULE_INFO}
        actions={<ClientDrawer open={open} setOpen={setOpen} onSaved={load} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total clientes" value={String(kpis.total)} />
        <Kpi icon={<HandCoins className="h-5 w-5" />} label="Con crédito activo" value={String(kpis.conActivo)} tone="primary" />
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Saldo en calle" value={money(kpis.saldo)} />
        <Kpi icon={<MapPin className="h-5 w-5" />} label="Ciudades" value={String(kpis.ciudades)} />
      </section>

      <DataTable
        rows={clients}
        columns={columns}
        rowActions={rowActions}
        search={(c) => `${c.fullName} ${c.documentId ?? ''} ${c.city ?? ''} ${c.phone ?? ''}`}
        searchPlaceholder="Buscar por nombre, documento, teléfono…"
        empty="Aún no hay clientes. Crea el primero."
      />

      <ClientDrawer
        open={editing !== null}
        setOpen={(v) => !v && setEditing(null)}
        client={editing ?? undefined}
        onSaved={load}
        hideTrigger
      />

      {/* Nuevo crédito para el cliente elegido (diálogo controlado) */}
      <CreateLoanDialog
        clientId={loanFor?.id}
        open={loanFor !== null}
        onOpenChange={(v) => !v && setLoanFor(null)}
        onCreated={() => { setLoanFor(null); load(); }}
        hideTrigger
      />

      <ClientLoansDrawer client={loansOf} onClose={() => setLoansOf(null)} onOpenLoan={(id) => router.push(`/dashboard/loan/${id}`)} />

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

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'primary' }) {
  const cls = tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`flex size-11 items-center justify-center rounded-2xl ${cls}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-extrabold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Drawer que lista los créditos de un cliente. */
function ClientLoansDrawer({ client, onClose, onOpenLoan }: { client: Client | null; onClose: () => void; onOpenLoan: (id: string) => void }) {
  const [loans, setLoans] = useState<Loan[] | null>(null);

  useEffect(() => {
    if (!client) { setLoans(null); return; }
    setLoans(null);
    fetchLoans()
      .then((d) => setLoans(d.loans.filter((l) => l.clientId === client.id)))
      .catch((e) => toast.error(e.message));
  }, [client]);

  const statusLabel: Record<string, string> = { ACTIVE: 'Activo', PAID: 'Pagado', DEFAULTED: 'En mora', PENDING_APPROVAL: 'Por aprobar', RENEWED: 'Renovado', CANCELLED: 'Cancelado' };

  return (
    <Sheet open={client !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5" /> Créditos de {client?.fullName}</SheetTitle>
        </SheetHeader>
        {loans === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : loans.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Este cliente no tiene créditos.</p>
        ) : (
          <div className="space-y-2">
            {loans.map((l) => (
              <button
                key={l.id}
                onClick={() => onOpenLoan(l.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === 'PAID' ? 'success' : l.status === 'DEFAULTED' ? 'destructive' : 'default'}>{statusLabel[l.status] ?? l.status}</Badge>
                    {l.routeName && <span className="truncate text-xs text-muted-foreground">{l.routeName}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Total {money(l.totalDue)} · Pagado {money(l.paidAmount)}</p>
                </div>
                <span className="shrink-0 font-bold">{money(l.balance)}</span>
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
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
