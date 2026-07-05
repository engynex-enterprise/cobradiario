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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  createClient, deleteClient, fetchClients, fetchLoans, updateClient,
  addGuarantor, updateGuarantor, deleteGuarantor,
  type Client, type ClientInput, type ClientGuarantor, type Loan,
} from '@/lib/graphql';
import { money } from '@/lib/utils';
import {
  Pencil, Plus, Trash2, UserRound, HandCoins, Eye, Phone, MessageCircle, Copy,
  Users, Wallet, MapPin, Loader2, ShieldCheck, X,
} from 'lucide-react';

const DOC_TYPES = ['CC', 'CE', 'NIT', 'PASAPORTE'];

/** Normaliza un teléfono colombiano para wa.me (solo dígitos, con indicativo 57). */
function waNumber(phone: string) {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('57') ? d : `57${d}`;
}

const MODULE_INFO = {
  summary: 'El directorio de tus deudores con su ficha completa (contacto, ubicación, perfil) y sus fiadores.',
  purpose:
    'Centraliza a cada persona a la que le prestas: datos para contactarla, ubicarla en la ruta, y sus fiadores como respaldo del crédito.',
  how: [
    'Los KPIs resumen tu base: total de clientes, con crédito activo, saldo en la calle y ciudades.',
    'Crea o edita un cliente con su ficha completa: identificación, contacto, ubicación, perfil y observaciones.',
    'Desde el menú (⋮) → "Fiadores" agregas, editas o eliminas los fiadores/codeudores del cliente.',
    'Filtra por ciudad o por estado de crédito, y busca por nombre, documento o teléfono.',
    'El menú también permite crear un crédito, ver sus créditos, escribirle por WhatsApp o llamarlo.',
  ],
  technical:
    'El Client trae agregados de cartera (loansCount, activeLoans, totalBalance) y su lista de Guarantor (tabla propia con RLS por tenant, relación 1:N). Los fiadores se administran con addGuarantor/updateGuarantor/deleteGuarantor (soft-delete).',
  plain:
    'Es la carpeta de cada cliente: sus teléfonos, dónde vive, en qué trabaja, cuánto te debe y quién responde por él (el fiador). Si el cliente no paga, sabes a quién más acudir.',
  tips: [
    'Registra al menos un fiador en los créditos grandes: es tu respaldo.',
    'Llena barrio y GPS para que el cobrador ubique rápido la casa.',
    'Usa los filtros para trabajar una sola ciudad o solo los que tienen crédito activo.',
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
  const [guarantorsOf, setGuarantorsOf] = useState<Client | null>(null);
  const [cityFilter, setCityFilter] = useState('all');
  const [creditFilter, setCreditFilter] = useState<'all' | 'active' | 'none'>('all');

  const load = useCallback(() => {
    fetchClients()
      .then((d) => {
        setClients(d.clients);
        // mantener el drawer de fiadores sincronizado si está abierto
        setGuarantorsOf((g) => (g ? d.clients.find((c) => c.id === g.id) ?? null : g));
      })
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  const kpis = useMemo(() => {
    const conActivo = clients.filter((c) => (c.activeLoans ?? 0) > 0).length;
    const saldo = clients.reduce((s, c) => s + (c.totalBalance ?? 0), 0);
    const ciudades = new Set(clients.map((c) => c.city).filter(Boolean)).size;
    return { total: clients.length, conActivo, saldo, ciudades };
  }, [clients]);

  const cities = useMemo(
    () => Array.from(new Set(clients.map((c) => c.city).filter(Boolean))).sort() as string[],
    [clients],
  );

  const rows = useMemo(
    () =>
      clients.filter((c) => {
        if (cityFilter !== 'all' && c.city !== cityFilter) return false;
        if (creditFilter === 'active' && (c.activeLoans ?? 0) === 0) return false;
        if (creditFilter === 'none' && (c.loansCount ?? 0) > 0) return false;
        return true;
      }),
    [clients, cityFilter, creditFilter],
  );

  const columns: Column<Client>[] = [
    {
      key: 'fullName', header: 'Nombre', sortable: true, sortValue: (c) => c.fullName,
      render: (c) => (
        <div>
          <p className="font-semibold">{c.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {c.documentId ? `${c.documentType ?? 'Doc'} ${c.documentId}` : 'Sin documento'}
            {c.occupation ? ` · ${c.occupation}` : ''}
          </p>
        </div>
      ),
    },
    { key: 'phone', header: 'Teléfono', render: (c) => <span className="text-muted-foreground">{c.phone ?? '—'}</span> },
    {
      key: 'city', header: 'Ubicación', sortable: true, sortValue: (c) => c.city ?? '',
      render: (c) => (
        <div className="text-muted-foreground">
          <p>{c.city ?? '—'}</p>
          {c.neighborhood && <p className="text-xs">{c.neighborhood}</p>}
        </div>
      ),
    },
    {
      key: 'guarantors', header: 'Fiadores', sortable: true, sortValue: (c) => c.guarantors?.length ?? 0,
      render: (c) =>
        (c.guarantors?.length ?? 0) === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />{c.guarantors!.length}</Badge>
        ),
    },
    {
      key: 'loans', header: 'Créditos', sortable: true, sortValue: (c) => c.activeLoans ?? 0,
      render: (c) =>
        (c.loansCount ?? 0) === 0 ? (
          <span className="text-xs text-muted-foreground">Sin créditos</span>
        ) : (
          <Badge variant={(c.activeLoans ?? 0) > 0 ? 'default' : 'secondary'}>
            {c.activeLoans ?? 0} activo{(c.activeLoans ?? 0) === 1 ? '' : 's'} · {c.loansCount}
          </Badge>
        ),
    },
    { key: 'totalBalance', header: 'Saldo', className: 'text-right', sortable: true, sortValue: (c) => c.totalBalance ?? 0, render: (c) => <span className="font-bold">{money(c.totalBalance ?? 0)}</span> },
  ];

  const rowActions = (c: Client): RowAction<Client>[] => [
    { label: 'Nuevo crédito', icon: HandCoins, onClick: () => setLoanFor(c) },
    { label: 'Ver créditos', icon: Eye, onClick: () => setLoansOf(c), hidden: () => (c.loansCount ?? 0) === 0 },
    { label: 'Fiadores', icon: ShieldCheck, onClick: () => setGuarantorsOf(c) },
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
        description="Directorio de deudores con su ficha completa y fiadores. Sus datos se usan al crear créditos y en las rutas de cobro."
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
        rows={rows}
        columns={columns}
        rowActions={rowActions}
        search={(c) => `${c.fullName} ${c.documentId ?? ''} ${c.city ?? ''} ${c.phone ?? ''} ${c.neighborhood ?? ''}`}
        searchPlaceholder="Buscar por nombre, documento, teléfono…"
        empty="No hay clientes con estos filtros."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={creditFilter} onValueChange={(v) => setCreditFilter(v as typeof creditFilter)}>
              <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Con crédito activo</SelectItem>
                <SelectItem value="none">Sin créditos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ClientDrawer
        open={editing !== null}
        setOpen={(v) => !v && setEditing(null)}
        client={editing ?? undefined}
        onSaved={load}
        hideTrigger
      />

      <CreateLoanDialog
        clientId={loanFor?.id}
        open={loanFor !== null}
        onOpenChange={(v) => !v && setLoanFor(null)}
        onCreated={() => { setLoanFor(null); load(); }}
        hideTrigger
      />

      <ClientLoansDrawer client={loansOf} onClose={() => setLoansOf(null)} onOpenLoan={(id) => router.push(`/dashboard/loan/${id}`)} />

      <GuarantorsDrawer client={guarantorsOf} onClose={() => setGuarantorsOf(null)} onChanged={load} />

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

const EMPTY_FORM: ClientInput = {
  fullName: '', documentType: 'CC', documentId: '', phone: '', phone2: '', email: '',
  address: '', neighborhood: '', city: '', occupation: '', birthDate: '', notes: '',
};

function ClientDrawer({
  open, setOpen, onSaved, client, hideTrigger,
}: {
  open: boolean; setOpen: (v: boolean) => void; onSaved: () => void; client?: Client; hideTrigger?: boolean;
}) {
  const isEdit = !!client;
  const [form, setForm] = useState<ClientInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({
        fullName: client.fullName ?? '',
        documentType: client.documentType ?? 'CC',
        documentId: client.documentId ?? '',
        phone: client.phone ?? '',
        phone2: client.phone2 ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        neighborhood: client.neighborhood ?? '',
        city: client.city ?? '',
        occupation: client.occupation ?? '',
        birthDate: client.birthDate ? client.birthDate.slice(0, 10) : '',
        latitude: client.latitude,
        longitude: client.longitude,
        notes: client.notes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, client]);

  const set = (k: keyof ClientInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // limpiar strings vacíos → undefined
      const payload: ClientInput = { fullName: form.fullName };
      (Object.keys(form) as (keyof ClientInput)[]).forEach((k) => {
        const v = form[k];
        if (k === 'fullName') return;
        if (v === '' || v === undefined || v === null) return;
        // @ts-expect-error asignación dinámica controlada
        payload[k] = k === 'birthDate' ? new Date(v as string).toISOString() : v;
      });
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
          <Button><Plus className="h-4 w-4" /> Nuevo cliente</Button>
        </SheetTrigger>
      )}
      <SheetContent className="w-full max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" /> {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-5">
          <FormSection title="Identificación">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input value={form.fullName} onChange={set('fullName')} required />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.documentType} onValueChange={(v) => setForm((f) => ({ ...f, documentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Documento</Label>
                <Input value={form.documentId} onChange={set('documentId')} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Contacto">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={set('phone')} inputMode="tel" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono alterno</Label>
                <Input value={form.phone2} onChange={set('phone2')} inputMode="tel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input value={form.email} onChange={set('email')} type="email" />
            </div>
          </FormSection>

          <FormSection title="Ubicación">
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Barrio</Label>
                <Input value={form.neighborhood} onChange={set('neighborhood')} />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={form.city} onChange={set('city')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Latitud (GPS)</Label>
                <Input value={form.latitude ?? ''} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : undefined }))} inputMode="decimal" placeholder="4.6097" />
              </div>
              <div className="space-y-2">
                <Label>Longitud (GPS)</Label>
                <Input value={form.longitude ?? ''} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : undefined }))} inputMode="decimal" placeholder="-74.0817" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Perfil">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Ocupación / negocio</Label>
                <Input value={form.occupation} onChange={set('occupation')} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" value={form.birthDate} onChange={set('birthDate')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <textarea
                value={form.notes} onChange={set('notes')} rows={2}
                placeholder="Notas internas sobre el cliente"
                className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
              />
            </div>
          </FormSection>

          <Button type="submit" className="w-full" disabled={saving || !form.fullName}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
          {isEdit && (
            <p className="text-center text-xs text-muted-foreground">
              Los fiadores se administran desde el menú (⋮) → Fiadores.
            </p>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
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

const EMPTY_GUARANTOR = { fullName: '', documentId: '', phone: '', address: '', relationship: '', notes: '' };

/** Drawer para administrar los fiadores de un cliente (agregar/editar/eliminar). */
function GuarantorsDrawer({ client, onClose, onChanged }: { client: Client | null; onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<ClientGuarantor[]>([]);
  const [form, setForm] = useState(EMPTY_GUARANTOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ClientGuarantor | null>(null);

  useEffect(() => {
    setItems(client?.guarantors ?? []);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_GUARANTOR);
  }, [client]);

  const set = (k: keyof typeof EMPTY_GUARANTOR) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function startAdd() { setEditingId(null); setForm(EMPTY_GUARANTOR); setShowForm(true); }
  function startEdit(g: ClientGuarantor) {
    setEditingId(g.id);
    setForm({ fullName: g.fullName, documentId: g.documentId ?? '', phone: g.phone ?? '', address: g.address ?? '', relationship: g.relationship ?? '', notes: g.notes ?? '' });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setSaving(true);
    try {
      const clean = {
        fullName: form.fullName,
        documentId: form.documentId || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        relationship: form.relationship || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) {
        const { updateGuarantor: g } = await updateGuarantor({ id: editingId, ...clean });
        setItems((xs) => xs.map((x) => (x.id === editingId ? g : x)));
        toast.success('Fiador actualizado');
      } else {
        const { addGuarantor: g } = await addGuarantor({ clientId: client.id, ...clean });
        setItems((xs) => [...xs, g]);
        toast.success('Fiador agregado');
      }
      setShowForm(false);
      setForm(EMPTY_GUARANTOR);
      setEditingId(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteGuarantor(toDelete.id);
      setItems((xs) => xs.filter((x) => x.id !== toDelete.id));
      toast.success('Fiador eliminado');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      throw err;
    }
  }

  return (
    <>
      <Sheet open={client !== null} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Fiadores de {client?.fullName}</SheetTitle>
          </SheetHeader>

          {items.length === 0 && !showForm ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Este cliente no tiene fiadores registrados.</p>
          ) : (
            <div className="space-y-2">
              {items.map((g) => (
                <div key={g.id} className="rounded-xl border-2 border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{g.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.relationship ? `${g.relationship} · ` : ''}{g.documentId ?? 'Sin documento'}
                      </p>
                      {(g.phone || g.address) && (
                        <p className="text-xs text-muted-foreground">{[g.phone, g.address].filter(Boolean).join(' · ')}</p>
                      )}
                      {g.notes && <p className="mt-1 text-xs italic text-muted-foreground">{g.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {g.phone && (
                        <button title="WhatsApp" onClick={() => window.open(`https://wa.me/${waNumber(g.phone!)}`, '_blank')} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button title="Editar" onClick={() => startEdit(g)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button title="Eliminar" onClick={() => setToDelete(g)} className="flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold">{editingId ? 'Editar fiador' : 'Nuevo fiador'}</p>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={form.fullName} onChange={set('fullName')} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Documento</Label>
                  <Input value={form.documentId} onChange={set('documentId')} />
                </div>
                <div className="space-y-2">
                  <Label>Parentesco</Label>
                  <Input value={form.relationship} onChange={set('relationship')} placeholder="Esposo, hermano…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.phone} onChange={set('phone')} inputMode="tel" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={form.address} onChange={set('address')} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving || !form.fullName}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editingId ? 'Guardar' : 'Agregar fiador'}
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="mt-4 w-full" onClick={startAdd}>
              <Plus className="h-4 w-4" /> Agregar fiador
            </Button>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar fiador"
        description={`Se eliminará a "${toDelete?.fullName ?? ''}" como fiador.`}
        onConfirm={confirmDelete}
      />
    </>
  );
}
