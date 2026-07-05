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
import { ImageUpload } from '@/components/ui/image-upload';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  createClient, deleteClient, fetchClient, fetchClients, fetchLoans, updateClient, uploadImage,
  addGuarantor, updateGuarantor, deleteGuarantor,
  type Client, type ClientInput, type ClientGuarantor, type ClientReference, type Loan,
} from '@/lib/graphql';
import { money, cn } from '@/lib/utils';
import { CITIES, RELATIONSHIPS, formatPhoneCO, titleCase, normalizeEmail, digitsOnly } from '@/lib/co-data';
import {
  Pencil, Plus, Trash2, UserRound, HandCoins, Eye, Phone, MessageCircle, Copy,
  Users, Wallet, MapPin, Loader2, ShieldCheck, X, Gauge, ShieldAlert, Contact,
} from 'lucide-react';

const DOC_TYPES = ['CC', 'CE', 'NIT', 'PASAPORTE'];

function waNumber(phone: string) {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('57') ? d : `57${d}`;
}

/** Sube una imagen a InsForge (vía backend) y devuelve su URL pública. */
const uploadClientImage = (dataUrl: string) => uploadImage(dataUrl, 'clients').then((d) => d.uploadImage.url);

/** Color/etiqueta del score crediticio (estilo DataCrédito). */
function riskStyle(risk?: string): { label: string; badge: 'success' | 'warning' | 'destructive' | 'secondary'; bar: string; text: string } {
  switch (risk) {
    case 'LOW': return { label: 'Bajo riesgo', badge: 'success', bar: 'bg-emerald-500', text: 'text-emerald-600' };
    case 'MEDIUM': return { label: 'Riesgo medio', badge: 'warning', bar: 'bg-amber-500', text: 'text-amber-600' };
    case 'HIGH': return { label: 'Alto riesgo', badge: 'destructive', bar: 'bg-red-500', text: 'text-red-600' };
    default: return { label: 'Sin historial', badge: 'secondary', bar: 'bg-muted-foreground', text: 'text-muted-foreground' };
  }
}
const SCORE_MIN = 150, SCORE_MAX = 950;
const scorePct = (s: number) => Math.round(((s - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100);

const MODULE_INFO = {
  summary: 'El directorio de tus deudores con ficha completa (contacto, ubicación, documentos, firma), fiadores, referencias y un score de riesgo estilo DataCrédito.',
  purpose:
    'Centraliza a cada cliente y te dice, con un puntaje de 150 a 950, qué tan probable es que pague, para decidir a quién prestarle y cuánto.',
  how: [
    'Los KPIs resumen tu base y cuántos clientes son de alto riesgo.',
    'La columna "Score" muestra el puntaje y el nivel de riesgo (verde/ámbar/rojo).',
    'Crea/edita la ficha: identificación, contacto, ubicación, foto, foto del documento, selfie con documento y firma digital.',
    'Registra referencias personales y, desde el menú (⋮) → Fiadores, sus codeudores.',
    'Filtra por riesgo, ciudad o estado de crédito; busca por nombre, documento o teléfono.',
  ],
  technical:
    'El score (150–950) se calcula del comportamiento: parte de 700, suma por créditos pagados, penaliza fuerte los créditos en mora (DEFAULTED) y su proporción; la lista de bloqueados baja a 180. Riesgo: LOW ≥780, MEDIUM ≥620, HIGH <620. Las imágenes se guardan comprimidas como data URLs y solo se cargan al abrir la ficha (fetchClient).',
  plain:
    'Es como el DataCrédito del barrio: a quien siempre paga le sube el puntaje y se pinta de verde; a quien se atrasa se le pone rojo. Además guardas su foto, la foto de la cédula y su firma para respaldar el préstamo.',
  tips: [
    'Antes de prestar, mira el score: rojo = piénsalo dos veces o pide más fiadores.',
    'Toma la foto del documento y la selfie con documento para evitar suplantaciones.',
    'La firma digital queda como respaldo del acuerdo.',
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
  const [riskFilter, setRiskFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');

  const load = useCallback(() => {
    fetchClients()
      .then((d) => {
        setClients(d.clients);
        setGuarantorsOf((g) => (g ? d.clients.find((c) => c.id === g.id) ?? null : g));
      })
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  const kpis = useMemo(() => {
    const conActivo = clients.filter((c) => (c.activeLoans ?? 0) > 0).length;
    const saldo = clients.reduce((s, c) => s + (c.totalBalance ?? 0), 0);
    const altoRiesgo = clients.filter((c) => c.riskLevel === 'HIGH').length;
    return { total: clients.length, conActivo, saldo, altoRiesgo };
  }, [clients]);

  const cities = useMemo(
    () => Array.from(new Set(clients.map((c) => c.city).filter(Boolean))).sort() as string[],
    [clients],
  );
  const creators = useMemo(
    () => Array.from(new Set(clients.map((c) => c.createdByName).filter(Boolean))).sort() as string[],
    [clients],
  );
  // Barrios ya usados por ciudad (para el combobox dependiente).
  const barriosByCity = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const c of clients) {
      if (c.city && c.neighborhood) (m[c.city] ??= new Set()).add(c.neighborhood);
    }
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Array.from(v).sort()]));
  }, [clients]);
  const cityOptions = useMemo(() => Array.from(new Set([...CITIES, ...cities])).sort(), [cities]);

  const rows = useMemo(
    () =>
      clients.filter((c) => {
        if (cityFilter !== 'all' && c.city !== cityFilter) return false;
        if (creditFilter === 'active' && (c.activeLoans ?? 0) === 0) return false;
        if (creditFilter === 'none' && (c.loansCount ?? 0) > 0) return false;
        if (riskFilter !== 'all' && c.riskLevel !== riskFilter) return false;
        if (creatorFilter !== 'all' && c.createdByName !== creatorFilter) return false;
        return true;
      }),
    [clients, cityFilter, creditFilter, riskFilter, creatorFilter],
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
    {
      key: 'score', header: 'Score', sortable: true, sortValue: (c) => c.creditScore ?? -1,
      render: (c) => <ScoreCell client={c} />,
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
            {c.activeLoans ?? 0} act · {c.loansCount}
          </Badge>
        ),
    },
    { key: 'createdByName', header: 'Creado por', sortable: true, sortValue: (c) => c.createdByName ?? '', render: (c) => <span className="text-muted-foreground">{c.createdByName ?? '—'}</span> },
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
        description="Directorio de deudores con ficha completa, fiadores, referencias y score de riesgo estilo DataCrédito."
        info={MODULE_INFO}
        actions={<ClientDrawer open={open} setOpen={setOpen} onSaved={load} cityOptions={cityOptions} barriosByCity={barriosByCity} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total clientes" value={String(kpis.total)} />
        <Kpi icon={<HandCoins className="h-5 w-5" />} label="Con crédito activo" value={String(kpis.conActivo)} tone="primary" />
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Saldo en calle" value={money(kpis.saldo)} />
        <Kpi icon={<ShieldAlert className="h-5 w-5" />} label="Alto riesgo" value={String(kpis.altoRiesgo)} tone={kpis.altoRiesgo > 0 ? 'destructive' : undefined} />
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
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="h-11 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo riesgo</SelectItem>
                <SelectItem value="LOW">Bajo riesgo</SelectItem>
                <SelectItem value="MEDIUM">Riesgo medio</SelectItem>
                <SelectItem value="HIGH">Alto riesgo</SelectItem>
                <SelectItem value="NONE">Sin historial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={creditFilter} onValueChange={(v) => setCreditFilter(v as typeof creditFilter)}>
              <SelectTrigger className="h-11 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Con crédito activo</SelectItem>
                <SelectItem value="none">Sin créditos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-11 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {creators.length > 0 && (
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cobradores</SelectItem>
                  {creators.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <ClientDrawer
        open={editing !== null}
        setOpen={(v) => !v && setEditing(null)}
        client={editing ?? undefined}
        onSaved={load}
        cityOptions={cityOptions}
        barriosByCity={barriosByCity}
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

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'primary' | 'destructive' }) {
  const cls = tone === 'destructive' ? 'bg-destructive/10 text-destructive' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
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

/** Celda de score: número + mini barra de color por riesgo. */
function ScoreCell({ client }: { client: Client }) {
  const st = riskStyle(client.riskLevel);
  if (client.creditScore == null) return <span className="text-xs text-muted-foreground">Sin historial</span>;
  return (
    <div className="w-24">
      <div className="flex items-baseline justify-between">
        <span className={cn('text-sm font-extrabold', st.text)}>{client.creditScore}</span>
        <span className="text-[10px] text-muted-foreground">{st.label}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', st.bar)} style={{ width: `${scorePct(client.creditScore)}%` }} />
      </div>
    </div>
  );
}

const EMPTY_FORM: ClientInput = {
  fullName: '', documentType: 'CC', documentId: '', phone: '', phone2: '', email: '',
  address: '', neighborhood: '', city: '', occupation: '', birthDate: '', notes: '',
  references: [],
};

function ClientDrawer({
  open, setOpen, onSaved, client, hideTrigger, cityOptions, barriosByCity,
}: {
  open: boolean; setOpen: (v: boolean) => void; onSaved: () => void; client?: Client; hideTrigger?: boolean;
  cityOptions: string[]; barriosByCity: Record<string, string[]>;
}) {
  const isEdit = !!client;
  const [form, setForm] = useState<ClientInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const barrioOptions = form.city ? barriosByCity[form.city] ?? [] : [];

  useEffect(() => {
    if (!open) return;
    if (!client) { setForm(EMPTY_FORM); return; }
    // Cargar ficha completa (incluye imágenes y referencias).
    setLoadingDetail(true);
    fetchClient(client.id)
      .then(({ client: c }) => setForm(clientToForm(c)))
      .catch(() => setForm(clientToForm(client)))
      .finally(() => setLoadingDetail(false));
  }, [open, client]);

  const set = (k: keyof ClientInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setImg = (k: keyof ClientInput) => (v?: string) => setForm((f) => ({ ...f, [k]: v }));

  // ---- referencias ----
  const addRef = () => setForm((f) => ({ ...f, references: [...(f.references ?? []), { fullName: '' }] }));
  const setRef = (i: number, k: keyof ClientReference, v: string) =>
    setForm((f) => ({ ...f, references: (f.references ?? []).map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const removeRef = (i: number) => setForm((f) => ({ ...f, references: (f.references ?? []).filter((_, j) => j !== i) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: ClientInput = { fullName: form.fullName };
      // texto/número: se omiten si están vacíos
      (['documentType', 'documentId', 'phone', 'phone2', 'email', 'address', 'neighborhood', 'city', 'occupation', 'notes'] as const)
        .forEach((k) => { if (form[k]) (payload as unknown as Record<string, unknown>)[k] = form[k]; });
      if (form.birthDate) payload.birthDate = new Date(form.birthDate).toISOString();
      if (form.latitude !== undefined) payload.latitude = form.latitude;
      if (form.longitude !== undefined) payload.longitude = form.longitude;
      // imágenes: se envían siempre (permite limpiar en edición)
      payload.photoUrl = form.photoUrl ?? null as unknown as undefined;
      payload.documentFrontUrl = form.documentFrontUrl ?? null as unknown as undefined;
      payload.documentBackUrl = form.documentBackUrl ?? null as unknown as undefined;
      payload.selfieWithDocUrl = form.selfieWithDocUrl ?? null as unknown as undefined;
      payload.signatureUrl = form.signatureUrl ?? null as unknown as undefined;
      // referencias válidas
      payload.references = (form.references ?? [])
        .filter((r) => r.fullName.trim())
        .map((r) => ({ fullName: r.fullName.trim(), phone: r.phone || undefined, relationship: r.relationship || undefined, notes: r.notes || undefined }));

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

        {loadingDetail ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {isEdit && client?.creditScore != null && <ScorePanel client={client} />}

            <FormSection title="Identificación">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={form.fullName} onChange={set('fullName')} onBlur={(e) => setForm((f) => ({ ...f, fullName: titleCase(e.target.value) }))} required />
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
                  <Input value={form.documentId} onChange={(e) => setForm((f) => ({ ...f, documentId: digitsOnly(e.target.value) }))} inputMode="numeric" />
                </div>
              </div>
            </FormSection>

            <FormSection title="Contacto">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneCO(e.target.value) }))} inputMode="tel" placeholder="300 123 4567" /></div>
                <div className="space-y-2"><Label>Teléfono alterno</Label><Input value={form.phone2} onChange={(e) => setForm((f) => ({ ...f, phone2: formatPhoneCO(e.target.value) }))} inputMode="tel" placeholder="300 123 4567" /></div>
              </div>
              <div className="space-y-2"><Label>Correo electrónico</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: normalizeEmail(e.target.value) }))} type="email" placeholder="correo@ejemplo.com" /></div>
            </FormSection>

            <FormSection title="Ubicación">
              <div className="space-y-2"><Label>Dirección</Label><Input value={form.address} onChange={set('address')} onBlur={(e) => setForm((f) => ({ ...f, address: titleCase(e.target.value) }))} placeholder="Calle 10 # 5-20" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Combobox value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: titleCase(v), neighborhood: '' }))} options={cityOptions} placeholder="Elegir ciudad" searchPlaceholder="Buscar ciudad…" />
                </div>
                <div className="space-y-2">
                  <Label>Barrio</Label>
                  <Combobox value={form.neighborhood} onChange={(v) => setForm((f) => ({ ...f, neighborhood: titleCase(v) }))} options={barrioOptions} placeholder="Elegir barrio" searchPlaceholder="Buscar barrio…" disabled={!form.city} disabledHint="Elige primero la ciudad" emptyText="Escribe para agregar" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Latitud (GPS)</Label><Input value={form.latitude ?? ''} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : undefined }))} inputMode="decimal" placeholder="4.6097" /></div>
                <div className="space-y-2"><Label>Longitud (GPS)</Label><Input value={form.longitude ?? ''} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : undefined }))} inputMode="decimal" placeholder="-74.0817" /></div>
              </div>
            </FormSection>

            <FormSection title="Perfil">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Ocupación / negocio</Label><Input value={form.occupation} onChange={set('occupation')} onBlur={(e) => setForm((f) => ({ ...f, occupation: titleCase(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Fecha de nacimiento</Label><DatePicker value={form.birthDate} onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))} disableFuture placeholder="Elegir fecha" /></div>
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Notas internas" className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40" />
              </div>
            </FormSection>

            <FormSection title="Documentos y foto">
              <div className="grid grid-cols-2 gap-3">
                <ImageUpload label="Foto de la persona" value={form.photoUrl} onChange={setImg('photoUrl')} onUpload={uploadClientImage} />
                <ImageUpload label="Selfie con documento" value={form.selfieWithDocUrl} onChange={setImg('selfieWithDocUrl')} onUpload={uploadClientImage} hint="Persona sosteniendo el documento junto a la cara" />
                <ImageUpload label="Documento (frente)" value={form.documentFrontUrl} onChange={setImg('documentFrontUrl')} onUpload={uploadClientImage} />
                <ImageUpload label="Documento (reverso)" value={form.documentBackUrl} onChange={setImg('documentBackUrl')} onUpload={uploadClientImage} />
              </div>
            </FormSection>

            <FormSection title="Firma digital">
              <SignaturePad value={form.signatureUrl} onChange={setImg('signatureUrl')} onUpload={uploadClientImage} />
            </FormSection>

            <FormSection title="Referencias personales">
              {(form.references ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin referencias. Agrega contactos que respondan por el cliente.</p>}
              <div className="space-y-2">
                {(form.references ?? []).map((r, i) => (
                  <div key={i} className="rounded-xl border-2 border-border p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Referencia {i + 1}</span>
                      <button type="button" onClick={() => removeRef(i)} className="text-destructive hover:opacity-70"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="space-y-2">
                      <Input value={r.fullName} onChange={(e) => setRef(i, 'fullName', e.target.value)} onBlur={(e) => setRef(i, 'fullName', titleCase(e.target.value))} placeholder="Nombre completo" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={r.phone ?? ''} onChange={(e) => setRef(i, 'phone', formatPhoneCO(e.target.value))} placeholder="Teléfono" inputMode="tel" />
                        <Combobox value={r.relationship ?? ''} onChange={(v) => setRef(i, 'relationship', v)} options={RELATIONSHIPS} placeholder="Parentesco" searchPlaceholder="Buscar…" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={addRef}><Plus className="h-4 w-4" /> Agregar referencia</Button>
            </FormSection>

            <Button type="submit" className="w-full" disabled={saving || !form.fullName}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
            {isEdit && <p className="text-center text-xs text-muted-foreground">Los fiadores se administran desde el menú (⋮) → Fiadores.</p>}
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Panel de score dentro de la ficha (medidor tipo DataCrédito). */
function ScorePanel({ client }: { client: Client }) {
  const st = riskStyle(client.riskLevel);
  const score = client.creditScore!;
  return (
    <div className="rounded-2xl border-2 border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-extrabold"><Gauge className="h-5 w-5 text-primary" /> Score crediticio</span>
        <Badge variant={st.badge}>{st.label}</Badge>
      </div>
      <div className="flex items-end gap-2">
        <span className={cn('text-3xl font-extrabold', st.text)}>{score}</span>
        <span className="pb-1 text-xs text-muted-foreground">/ {SCORE_MAX}</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', st.bar)} style={{ width: `${scorePct(score)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {client.paidLoans ?? 0} pagados · {client.defaultedLoans ?? 0} en mora · {client.loansCount ?? 0} créditos
      </p>
    </div>
  );
}

function clientToForm(c: Client): ClientInput {
  return {
    fullName: c.fullName ?? '',
    documentType: c.documentType ?? 'CC',
    documentId: c.documentId ?? '',
    phone: c.phone ?? '',
    phone2: c.phone2 ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    neighborhood: c.neighborhood ?? '',
    city: c.city ?? '',
    occupation: c.occupation ?? '',
    birthDate: c.birthDate ? c.birthDate.slice(0, 10) : '',
    latitude: c.latitude,
    longitude: c.longitude,
    notes: c.notes ?? '',
    photoUrl: c.photoUrl,
    documentFrontUrl: c.documentFrontUrl,
    documentBackUrl: c.documentBackUrl,
    selfieWithDocUrl: c.selfieWithDocUrl,
    signatureUrl: c.signatureUrl,
    references: c.references ?? [],
  };
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ClientLoansDrawer({ client, onClose, onOpenLoan }: { client: Client | null; onClose: () => void; onOpenLoan: (id: string) => void }) {
  const [loans, setLoans] = useState<Loan[] | null>(null);

  useEffect(() => {
    if (!client) { setLoans(null); return; }
    setLoans(null);
    fetchLoans().then((d) => setLoans(d.loans.filter((l) => l.clientId === client.id))).catch((e) => toast.error(e.message));
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
              <button key={l.id} onClick={() => onOpenLoan(l.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent">
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

  const set = (k: keyof typeof EMPTY_GUARANTOR) => (e: React.ChangeEvent<HTMLInputElement>) =>
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
      setShowForm(false); setForm(EMPTY_GUARANTOR); setEditingId(null);
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
                      <p className="text-xs text-muted-foreground">{g.relationship ? `${g.relationship} · ` : ''}{g.documentId ?? 'Sin documento'}</p>
                      {(g.phone || g.address) && <p className="text-xs text-muted-foreground">{[g.phone, g.address].filter(Boolean).join(' · ')}</p>}
                      {g.notes && <p className="mt-1 text-xs italic text-muted-foreground">{g.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {g.phone && <button title="WhatsApp" onClick={() => window.open(`https://wa.me/${waNumber(g.phone!)}`, '_blank')} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><MessageCircle className="h-4 w-4" /></button>}
                      <button title="Editar" onClick={() => startEdit(g)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button title="Eliminar" onClick={() => setToDelete(g)} className="flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
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
              <div className="space-y-2"><Label>Nombre completo *</Label><Input value={form.fullName} onChange={set('fullName')} onBlur={(e) => setForm((f) => ({ ...f, fullName: titleCase(e.target.value) }))} required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Documento</Label><Input value={form.documentId} onChange={(e) => setForm((f) => ({ ...f, documentId: digitsOnly(e.target.value) }))} inputMode="numeric" /></div>
                <div className="space-y-2"><Label>Parentesco</Label><Combobox value={form.relationship} onChange={(v) => setForm((f) => ({ ...f, relationship: v }))} options={RELATIONSHIPS} placeholder="Parentesco" searchPlaceholder="Buscar…" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneCO(e.target.value) }))} inputMode="tel" /></div>
                <div className="space-y-2"><Label>Dirección</Label><Input value={form.address} onChange={set('address')} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={saving || !form.fullName}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editingId ? 'Guardar' : 'Agregar fiador'}
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="mt-4 w-full" onClick={startAdd}><Contact className="h-4 w-4" /> Agregar fiador</Button>
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
