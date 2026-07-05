'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ModuleInfoButton } from '@/components/module-info';
import { SettingsShell, SETTINGS_SECTIONS } from '@/components/settings-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  fetchOrganization, fetchOrgMembers, fetchPendingInvitations, fetchAuditLogs, updateOrganization, fetchProducts,
  inviteMember, cancelInvitation, updateMemberRole, removeMember,
  fetchRoles, createRole, updateRole, deleteRole,
  type Organization, type OrgMember, type OrgInvitation, type OrgAuditLog, type OrgUpdate, type Product, type OrgRole,
} from '@/lib/graphql';
import { formatDate, cn } from '@/lib/utils';
import { MailPlus, Trash2, Loader2, UserPlus, X, Check, Plus, Shield, Lock } from 'lucide-react';

const ROLES = [
  { value: 'OWNER', label: 'Dueño' }, { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Supervisor' }, { value: 'COLLECTOR', label: 'Cobrador' }, { value: 'VIEWER', label: 'Consulta' },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;
const CURRENCIES = ['COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS', 'EUR'];
const LANGUAGES = [{ v: 'es', l: 'Español' }, { v: 'en', l: 'English' }];
const TIMEZONES = ['America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/New_York'];

const MODULE_INFO = {
  summary: 'El centro de configuración de tu organización (empresa): ajustes generales, finanzas, notificaciones, miembros, roles, auditoría y todos los módulos del negocio.',
  purpose: 'Todo lo configurable de la empresa en un solo lugar, separado de tu cuenta personal.',
  how: [
    'Usa las pestañas para moverte entre secciones.',
    'General: nombre, moneda, idioma, zona horaria y datos fiscales.',
    'Finanzas: valores por defecto para nuevos créditos (interés, mora, plazo).',
    'Notificaciones: qué eventos avisan y por qué canal.',
    'Miembros/Roles: gestiona el equipo y sus permisos. Módulos: rutas, productos, etiquetas y facturación.',
  ],
  technical: 'Los ajustes viven en el tenant (columnas + settings JSON). Roles vía Membership; permisos por rol. Auditoría desde AuditLog. Todo aislado por RLS.',
  plain: 'Es el "panel de control" de tu empresa: aquí decides cómo funciona todo — la moneda, los intereses, quién entra y qué puede hacer.',
  tips: ['Solo Dueño/Administrador pueden cambiar ajustes e invitar.', 'La moneda y el idioma aplican a toda la organización.'],
};

export default function OrganizacionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      <OrgSettings />
    </Suspense>
  );
}

function OrgSettings() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const sp = useSearchParams();
  const sParam = sp.get('s') ?? 'general';
  const tab = (SETTINGS_SECTIONS.some((s) => s.key === sParam) ? sParam : 'general') as
    'general' | 'politicas' | 'notificaciones' | 'miembros' | 'roles' | 'auditoria';
  const active = SETTINGS_SECTIONS.find((s) => s.key === tab)!;
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvitation[]>([]);
  const [logs, setLogs] = useState<OrgAuditLog[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<OrgMember | null>(null);

  const load = useCallback(() => {
    fetchOrganization().then((d) => setOrg(d.organization)).catch((e) => toast.error(e.message));
    fetchOrgMembers().then((d) => setMembers(d.organizationMembers)).catch(() => {});
    if (canManage) {
      fetchPendingInvitations().then((d) => setInvites(d.pendingInvitations)).catch(() => {});
      fetchAuditLogs().then((d) => setLogs(d.auditLogs)).catch(() => {});
    }
  }, [canManage]);
  useEffect(() => load(), [load]);

  async function save(patch: OrgUpdate) {
    try { const { updateOrganization: o } = await updateOrganization(patch); setOrg(o); toast.success('Ajustes guardados'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }
  async function confirmRemove() {
    if (!toRemove) return;
    try { const { removeMember: rows } = await removeMember(toRemove.id); setMembers(rows); toast.success('Miembro eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); throw e; }
  }

  const isOrg = org?.type === 'ORGANIZATION';

  return (
    <SettingsShell active={tab} title={org?.name ?? (isOrg ? 'Organización' : 'Ajustes')}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><active.icon className="size-5" /></span>
            <div><h1 className="text-lg font-extrabold tracking-tight">{active.label}</h1><p className="text-sm text-muted-foreground">{isOrg ? 'Organización' : 'Mi negocio'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'miembros' && canManage && <Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" /> Invitar</Button>}
            <ModuleInfoButton info={MODULE_INFO} moduleTitle="Ajustes" />
          </div>
        </div>

        {!org ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <>
            {tab === 'general' && <GeneralTab org={org} canManage={canManage} onSave={save} />}
            {tab === 'politicas' && <FinanzasTab org={org} canManage={canManage} onSave={save} />}
            {tab === 'notificaciones' && <NotificacionesTab org={org} canManage={canManage} onSave={save} />}
            {tab === 'roles' && <RolesTab canManage={canManage} />}
            {tab === 'auditoria' && (canManage ? <AuditoriaTab logs={logs} /> : <NoPerm />)}
            {tab === 'miembros' && (
              <MiembrosTab
                org={org} members={members} invites={invites} canManage={canManage} currentUserId={user?.id}
                onInvite={() => setInviteOpen(true)} onRemove={setToRemove}
                onRole={async (m, role) => { try { const { updateMemberRole: rows } = await updateMemberRole(m.id, role); setMembers(rows); toast.success('Rol actualizado'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); } }}
                onCancelInvite={async (inv) => { try { await cancelInvitation(inv.id); setInvites((xs) => xs.filter((x) => x.id !== inv.id)); toast.success('Invitación cancelada'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); } }}
              />
            )}
          </>
        )}
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />
      <ConfirmDialog open={toRemove !== null} onOpenChange={(v) => !v && setToRemove(null)} title="Eliminar miembro" description={`Se dará de baja a "${toRemove?.fullName ?? ''}".`} onConfirm={confirmRemove} />
    </SettingsShell>
  );
}

function NoPerm() {
  return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No tienes permiso para ver esta sección.</CardContent></Card>;
}

// ---------- General ----------
function GeneralTab({ org, canManage, onSave }: { org: Organization; canManage: boolean; onSave: (p: OrgUpdate) => void }) {
  const [f, setF] = useState({ name: org.name, legalId: org.legalId ?? '', countryCode: org.countryCode, currency: org.currency, language: org.language, timezone: org.timezone });
  return (
    <Card><CardContent className="space-y-4 p-5">
      <p className="font-extrabold">General</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la organización"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={!canManage} /></Field>
        <Field label="NIT / documento fiscal"><Input value={f.legalId} onChange={(e) => setF({ ...f, legalId: e.target.value })} disabled={!canManage} /></Field>
        <Field label="País"><Input value={f.countryCode} onChange={(e) => setF({ ...f, countryCode: e.target.value.toUpperCase().slice(0, 2) })} disabled={!canManage} placeholder="CO" /></Field>
        <Field label="Moneda">
          <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })} disabled={!canManage}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Idioma">
          <Select value={f.language} onValueChange={(v) => setF({ ...f, language: v })} disabled={!canManage}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Zona horaria">
          <Select value={f.timezone} onValueChange={(v) => setF({ ...f, timezone: v })} disabled={!canManage}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      {canManage && <Button onClick={() => onSave(f)}>Guardar cambios</Button>}
      <p className="text-xs text-muted-foreground">Creada el {formatDate(org.createdAt)}</p>
    </CardContent></Card>
  );
}

// ---------- Políticas de crédito y caja ----------
function FinanzasTab({ org, canManage, onSave }: { org: Organization; canManage: boolean; onSave: (p: OrgUpdate) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [f, setF] = useState({
    defaultProductId: org.defaultProductId ?? '', graceDays: org.graceDays, installmentRounding: org.installmentRounding,
    minLoanAmount: org.minLoanAmount ?? 0, maxLoanAmount: org.maxLoanAmount ?? 0,
    moraRunHour: org.moraRunHour, reminderRunHour: org.reminderRunHour, requireBaseOnCashOpen: org.requireBaseOnCashOpen,
    collectorCanCreateLoan: org.collectorCanCreateLoan, collectorCanEditInstallment: org.collectorCanEditInstallment,
    collectorCanDiscount: org.collectorCanDiscount, collectorCanWaiveLateFee: org.collectorCanWaiveLateFee,
  });
  useEffect(() => { fetchProducts().then((d) => setProducts(d.creditProducts)).catch(() => {}); }, []);

  const Toggle = ({ k, label, desc }: { k: keyof typeof f; label: string; desc: string }) => (
    <button type="button" disabled={!canManage} onClick={() => setF({ ...f, [k]: !f[k] })} className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-border p-3 text-left disabled:opacity-70">
      <div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <span className={cn('flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors', f[k] ? 'bg-primary' : 'bg-muted')}><span className={cn('size-5 rounded-full bg-white shadow transition-transform', f[k] && 'translate-x-5')} /></span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
        Los <b>intereses, cuotas y frecuencia</b> se definen en <b>Módulos → Productos</b> (plantillas de crédito). Aquí configuras las <b>políticas</b> de la organización.
      </div>

      <Card><CardContent className="space-y-4 p-5">
        <p className="font-extrabold">Crédito</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Producto por defecto">
            <Select value={f.defaultProductId || 'none'} onValueChange={(v) => setF({ ...f, defaultProductId: v === 'none' ? '' : v })} disabled={!canManage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Ninguno</SelectItem>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Días de gracia antes de mora"><Input type="number" value={f.graceDays} onChange={(e) => setF({ ...f, graceDays: Number(e.target.value) })} disabled={!canManage} /></Field>
          <Field label="Redondear cuota al múltiplo de"><Input type="number" value={f.installmentRounding} onChange={(e) => setF({ ...f, installmentRounding: Number(e.target.value) })} disabled={!canManage} placeholder="0 = sin redondeo" /></Field>
          <div />
          <Field label="Monto mínimo de crédito"><CurrencyInput value={f.minLoanAmount} onValueChange={(v) => setF({ ...f, minLoanAmount: v })} /></Field>
          <Field label="Monto máximo de crédito"><CurrencyInput value={f.maxLoanAmount} onValueChange={(v) => setF({ ...f, maxLoanAmount: v })} /></Field>
        </div>
      </CardContent></Card>

      <Card><CardContent className="space-y-4 p-5">
        <p className="font-extrabold">Caja y automatización</p>
        <Toggle k="requireBaseOnCashOpen" label="Exigir base al abrir caja" desc="El cobrador debe registrar su base inicial." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hora de marcado de mora (0-23)"><Input type="number" min={0} max={23} value={f.moraRunHour} onChange={(e) => setF({ ...f, moraRunHour: Number(e.target.value) })} disabled={!canManage} /></Field>
          <Field label="Hora de recordatorios (0-23)"><Input type="number" min={0} max={23} value={f.reminderRunHour} onChange={(e) => setF({ ...f, reminderRunHour: Number(e.target.value) })} disabled={!canManage} /></Field>
        </div>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-5">
        <p className="font-extrabold">Permisos de cobradores</p>
        <Toggle k="collectorCanCreateLoan" label="Crear créditos" desc="Permitir que los cobradores otorguen créditos." />
        <Toggle k="collectorCanEditInstallment" label="Editar cuotas" desc="Modificar valor o fecha de cuotas." />
        <Toggle k="collectorCanDiscount" label="Aplicar descuentos" desc="Descontar en el abono." />
        <Toggle k="collectorCanWaiveLateFee" label="Condonar mora" desc="Perdonar la mora de una cuota." />
      </CardContent></Card>

      {canManage && <Button onClick={() => onSave({ ...f, minLoanAmount: f.minLoanAmount || undefined, maxLoanAmount: f.maxLoanAmount || undefined, defaultProductId: f.defaultProductId || undefined })}>Guardar políticas</Button>}
    </div>
  );
}

// ---------- Notificaciones ----------
function NotificacionesTab({ org, canManage, onSave }: { org: Organization; canManage: boolean; onSave: (p: OrgUpdate) => void }) {
  const [f, setF] = useState({
    notifyPaymentReceived: org.notifyPaymentReceived, notifyOverdue: org.notifyOverdue, notifyNewLoan: org.notifyNewLoan,
    notifyDailySummary: org.notifyDailySummary, notifyChannelEmail: org.notifyChannelEmail, notifyChannelPush: org.notifyChannelPush,
  });
  const T = ({ k, label, desc }: { k: keyof typeof f; label: string; desc: string }) => (
    <button type="button" disabled={!canManage} onClick={() => setF({ ...f, [k]: !f[k] })} className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-border p-3 text-left disabled:opacity-70">
      <div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <span className={cn('flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors', f[k] ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('size-5 rounded-full bg-white shadow transition-transform', f[k] && 'translate-x-5')} />
      </span>
    </button>
  );
  return (
    <div className="space-y-4">
      <Card><CardContent className="space-y-3 p-5">
        <p className="font-extrabold">Eventos</p>
        <T k="notifyPaymentReceived" label="Abono recibido" desc="Avisar cuando un cliente paga." />
        <T k="notifyOverdue" label="Cuotas vencidas" desc="Alertas de cartera en mora." />
        <T k="notifyNewLoan" label="Nuevo crédito" desc="Avisar al crear un crédito." />
        <T k="notifyDailySummary" label="Resumen diario" desc="Resumen de la jornada al cierre." />
      </CardContent></Card>
      <Card><CardContent className="space-y-3 p-5">
        <p className="font-extrabold">Canales</p>
        <T k="notifyChannelPush" label="Push (app)" desc="Notificaciones en la app móvil." />
        <T k="notifyChannelEmail" label="Correo" desc="Enviar por correo electrónico." />
        {canManage && <Button onClick={() => onSave(f)}>Guardar notificaciones</Button>}
      </CardContent></Card>
    </div>
  );
}

// ---------- Roles y permisos (matriz) ----------
// Catálogo de permisos (las claves deben coincidir con PERMISSIONS del backend).
const PERMISSION_CATALOG: { key: string; label: string; desc: string }[] = [
  { key: 'view_portfolio', label: 'Ver cartera y cobros', desc: 'Consultar créditos, cuotas y estado de cartera.' },
  { key: 'register_payments', label: 'Registrar abonos', desc: 'Recibir y registrar pagos de los clientes.' },
  { key: 'manage_loans', label: 'Gestionar créditos', desc: 'Crear y editar créditos.' },
  { key: 'manage_clients', label: 'Gestionar clientes', desc: 'Crear y editar clientes, fiadores y referencias.' },
  { key: 'manage_routes', label: 'Gestionar rutas y productos', desc: 'Administrar rutas, productos y etiquetas.' },
  { key: 'view_finance', label: 'Ver finanzas y reportes', desc: 'Acceder a finanzas, caja y reportes.' },
  { key: 'manage_members', label: 'Gestionar miembros', desc: 'Invitar miembros y cambiar sus roles.' },
  { key: 'org_settings', label: 'Ajustes de la organización', desc: 'Editar la configuración de la empresa.' },
  { key: 'delete_members', label: 'Eliminar miembros', desc: 'Dar de baja a miembros del equipo.' },
];

function RolesTab({ canManage }: { canManage: boolean }) {
  const [roles, setRoles] = useState<OrgRole[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; permissions: string[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<OrgRole | null>(null);

  useEffect(() => {
    fetchRoles().then((d) => {
      setRoles(d.roles);
      if (d.roles.length) setSelectedId((cur) => cur ?? d.roles[0].id);
    }).catch((e) => toast.error(e instanceof Error ? e.message : 'Error'));
  }, []);

  const selected = roles?.find((r) => r.id === selectedId) ?? null;
  // Vista efectiva: draft si estoy editando/creando, si no el rol seleccionado.
  const view = creating ? draft : (draft ?? (selected ? { name: selected.name, permissions: selected.permissions } : null));
  const editing = creating || draft !== null;

  function startCreate() {
    setCreating(true); setSelectedId(null);
    setDraft({ name: '', permissions: ['view_portfolio'] });
  }
  function startEdit() {
    if (!selected) return;
    setDraft({ name: selected.name, permissions: [...selected.permissions] });
  }
  function cancel() { setCreating(false); setDraft(null); }
  function togglePerm(key: string) {
    setDraft((d) => d ? { ...d, permissions: d.permissions.includes(key) ? d.permissions.filter((p) => p !== key) : [...d.permissions, key] } : d);
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error('Escribe un nombre para el rol.'); return; }
    setSaving(true);
    try {
      if (creating) {
        const { createRole: rows } = await createRole(draft.name.trim(), draft.permissions);
        setRoles(rows);
        const created = rows.find((r) => r.name === draft.name.trim());
        setSelectedId(created?.id ?? rows[rows.length - 1]?.id ?? null);
        toast.success('Rol creado');
      } else if (selected) {
        const patch = selected.isSystem ? { permissions: draft.permissions } : { name: draft.name.trim(), permissions: draft.permissions };
        const { updateRole: rows } = await updateRole(selected.id, patch);
        setRoles(rows);
        toast.success('Rol actualizado');
      }
      setCreating(false); setDraft(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      const { deleteRole: rows } = await deleteRole(toDelete.id);
      setRoles(rows);
      if (selectedId === toDelete.id) setSelectedId(rows[0]?.id ?? null);
      toast.success('Rol eliminado');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); throw e; }
  }

  if (roles === null) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Cargando roles…</CardContent></Card>;

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      {/* Lista de roles */}
      <Card><CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Roles</p>
          {canManage && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={startCreate}><Plus className="size-4" /></Button>}
        </div>
        <ul className="space-y-1">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { setSelectedId(r.id); cancel(); }}
                className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                  selectedId === r.id && !creating ? 'bg-accent text-accent-foreground' : 'hover:bg-muted')}
              >
                {r.isSystem ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : <Shield className="size-3.5 shrink-0 text-primary" />}
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="shrink-0 text-xs font-normal text-muted-foreground">{r.permissions.length}</span>
              </button>
            </li>
          ))}
          {creating && (
            <li className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
              <Shield className="size-3.5 shrink-0 text-primary" /><span className="italic">Nuevo rol…</span>
            </li>
          )}
        </ul>
      </CardContent></Card>

      {/* Detalle / editor */}
      <Card><CardContent className="space-y-4 p-5">
        {!view ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Selecciona un rol o crea uno nuevo.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <>
                    <Label className="mb-1 block">Nombre del rol</Label>
                    <Input
                      value={view.name}
                      disabled={!creating && selected?.isSystem}
                      onChange={(e) => setDraft((d) => d ? { ...d, name: e.target.value } : d)}
                      placeholder="Ej. Supervisor de zona"
                    />
                    {!creating && selected?.isSystem && <p className="mt-1 text-xs text-muted-foreground">Los roles del sistema no se pueden renombrar, pero sí ajustar sus permisos.</p>}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold">{selected?.name}</p>
                      {selected?.isSystem && <Badge variant="secondary" className="gap-1"><Lock className="size-3" /> Sistema</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{selected?.permissions.length ?? 0} permisos habilitados</p>
                  </>
                )}
              </div>
              {canManage && !editing && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={startEdit}>Editar permisos</Button>
                  {!selected?.isSystem && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => selected && setToDelete(selected)}><Trash2 className="size-4" /></Button>}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {PERMISSION_CATALOG.map((p) => {
                const on = view.permissions.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={!editing}
                    onClick={() => togglePerm(p.key)}
                    className={cn('flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                      on ? 'border-primary/40 bg-primary/5' : 'border-border',
                      editing ? 'cursor-pointer hover:border-primary/60' : 'cursor-default')}
                  >
                    <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
                      {on && <Check className="size-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {editing && (
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button variant="ghost" onClick={cancel} disabled={saving}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar</Button>
              </div>
            )}
          </>
        )}
      </CardContent></Card>

      <ConfirmDialog open={toDelete !== null} onOpenChange={(v) => !v && setToDelete(null)} title="Eliminar rol" description={`Se eliminará el rol "${toDelete?.name ?? ''}".`} onConfirm={confirmDelete} />
    </div>
  );
}

// ---------- Auditoría ----------
function AuditoriaTab({ logs }: { logs: OrgAuditLog[] }) {
  return (
    <Card><CardContent className="p-5">
      <p className="mb-4 font-extrabold">Registro de actividad</p>
      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay actividad registrada.</p>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{l.action} <span className="font-normal text-muted-foreground">· {l.entity}</span></p>
                <p className="text-xs text-muted-foreground">{l.userName ?? 'Sistema'}{l.ip ? ` · ${l.ip}` : ''}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </CardContent></Card>
  );
}

// ---------- Miembros ----------
function MiembrosTab({ org, members, invites, canManage, currentUserId, onInvite, onRemove, onRole, onCancelInvite }: {
  org: Organization; members: OrgMember[]; invites: OrgInvitation[]; canManage: boolean; currentUserId?: string;
  onInvite: () => void; onRemove: (m: OrgMember) => void; onRole: (m: OrgMember, role: string) => void; onCancelInvite: (inv: OrgInvitation) => void;
}) {
  const solo = org.type !== 'ORGANIZATION' && members.length <= 1;
  return (
    <div className="space-y-4">
      {solo && (
        <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div><p className="font-extrabold">Trabajas solo 👤</p><p className="text-sm text-muted-foreground">Invita a tu equipo (cobradores, admins) y tu espacio personal se convierte en una organización.</p></div>
          {canManage && <Button onClick={onInvite}><MailPlus className="h-4 w-4" /> Invitar a mi equipo</Button>}
        </CardContent></Card>
      )}
      <p className="text-sm text-muted-foreground">{org.memberCount} miembro(s)</p>
      <Card><CardContent className="space-y-2 p-5">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border p-3">
            <div className="min-w-0"><p className="font-semibold">{m.fullName} {m.id === currentUserId && <span className="text-xs text-muted-foreground">(tú)</span>}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
            <div className="flex items-center gap-2">
              {canManage && m.id !== currentUserId ? (
                <Select value={m.role} onValueChange={(v) => onRole(m, v)}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select>
              ) : <Badge variant="secondary">{roleLabel(m.role)}</Badge>}
              {canManage && m.id !== currentUserId && <button onClick={() => onRemove(m)} title="Eliminar" className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>}
            </div>
          </div>
        ))}
      </CardContent></Card>
      {canManage && invites.length > 0 && (
        <Card><CardContent className="space-y-2 p-5">
          <p className="font-extrabold">Invitaciones pendientes</p>
          {invites.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-border p-3">
              <div className="min-w-0"><p className="font-semibold">{inv.email}</p><p className="text-xs text-muted-foreground">{roleLabel(inv.role)} · vence {formatDate(inv.expiresAt)}</p></div>
              <button onClick={() => onCancelInvite(inv)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /> Cancelar</button>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COLLECTOR');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await inviteMember(email.trim().toLowerCase(), role); toast.success('Invitación enviada por correo'); setEmail(''); setRole('COLLECTOR'); onClose(); onInvited(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); } finally { setLoading(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invitar miembro</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Correo"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="empleado@correo.com" /></Field>
          <Field label="Rol"><Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.filter((r) => r.value !== 'OWNER').map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></Field>
          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enviar invitación</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
