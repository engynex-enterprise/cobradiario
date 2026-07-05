'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ModuleInfoButton } from '@/components/module-info';
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
  fetchOrganization, fetchOrgMembers, fetchPendingInvitations, fetchAuditLogs, updateOrganization,
  inviteMember, cancelInvitation, updateMemberRole, removeMember,
  type Organization, type OrgMember, type OrgInvitation, type OrgAuditLog, type OrgUpdate,
} from '@/lib/graphql';
import { formatDate, cn } from '@/lib/utils';
import {
  Building2, Users, MailPlus, Trash2, Loader2, Shield, UserPlus, X, Check,
  SlidersHorizontal, Coins, Bell, ScrollText, Route, Package, Tags, CreditCard, ChevronRight,
} from 'lucide-react';

const ROLES = [
  { value: 'OWNER', label: 'Dueño' }, { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Supervisor' }, { value: 'COLLECTOR', label: 'Cobrador' }, { value: 'VIEWER', label: 'Consulta' },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;
const CURRENCIES = ['COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS', 'EUR'];
const LANGUAGES = [{ v: 'es', l: 'Español' }, { v: 'en', l: 'English' }];
const TIMEZONES = ['America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/New_York'];
const METHODS = [{ v: 'FLAT', l: 'Fijo (flat)' }, { v: 'DECLINING_BALANCE', l: 'Saldo decreciente' }, { v: 'GERMAN', l: 'Alemán' }, { v: 'INTEREST_ONLY', l: 'Solo interés' }];
const FREQS = [{ v: 'DAILY', l: 'Diario' }, { v: 'WEEKLY', l: 'Semanal' }, { v: 'BIWEEKLY', l: 'Quincenal' }, { v: 'MONTHLY', l: 'Mensual' }];
const LATE_TYPES = [{ v: 'NONE', l: 'Sin mora' }, { v: 'FIXED', l: 'Monto fijo' }, { v: 'PERCENT', l: 'Porcentaje' }];

type Tab = 'general' | 'finanzas' | 'notificaciones' | 'miembros' | 'roles' | 'auditoria' | 'modulos';
const TABS: { key: Tab; label: string; icon: typeof Users; admin?: boolean }[] = [
  { key: 'general', label: 'General', icon: SlidersHorizontal },
  { key: 'finanzas', label: 'Finanzas', icon: Coins },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { key: 'miembros', label: 'Miembros', icon: Users },
  { key: 'roles', label: 'Roles y permisos', icon: Shield },
  { key: 'auditoria', label: 'Auditoría', icon: ScrollText, admin: true },
  { key: 'modulos', label: 'Módulos', icon: Package },
];

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
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [tab, setTab] = useState<Tab>('general');
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

  const visibleTabs = TABS.filter((t) => !t.admin || canManage);
  const active = visibleTabs.find((t) => t.key === tab) ?? visibleTabs[0];

  return (
    <div className="flex min-h-[calc(100dvh-4rem)]">
      {/* Sub-sidebar pegado al sidebar principal (izquierda) */}
      <aside className="sticky top-0 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col border-r-2 border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 border-b-2 border-sidebar-border p-4">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="size-5" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{org?.name ?? 'Organización'}</p>
            <p className="text-[11px] text-muted-foreground">Ajustes</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-[13px] font-bold transition-colors',
                tab === t.key ? 'border-sky-300 bg-accent text-accent-foreground' : 'border-transparent text-foreground/70 hover:bg-muted hover:text-foreground',
              )}
            >
              <t.icon className="size-5 shrink-0" />
              <span className="flex-1 text-left">{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        {/* Nav horizontal en móvil */}
        <nav className="flex gap-1 overflow-x-auto border-b-2 border-border bg-card px-2 py-2 md:hidden">
          {visibleTabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold uppercase', tab === t.key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}>{t.label}</button>
          ))}
        </nav>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><active.icon className="size-5" /></span>
              <div><h1 className="text-lg font-extrabold tracking-tight">{active.label}</h1><p className="text-sm text-muted-foreground">Organización</p></div>
            </div>
            <div className="flex items-center gap-2">
              {tab === 'miembros' && canManage && <Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" /> Invitar</Button>}
              <ModuleInfoButton info={MODULE_INFO} moduleTitle="Organización" />
            </div>
          </div>

          {!org ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : (
            <>
              {tab === 'general' && <GeneralTab org={org} canManage={canManage} onSave={save} />}
              {tab === 'finanzas' && <FinanzasTab org={org} canManage={canManage} onSave={save} />}
              {tab === 'notificaciones' && <NotificacionesTab org={org} canManage={canManage} onSave={save} />}
              {tab === 'roles' && <RolesTab />}
              {tab === 'auditoria' && canManage && <AuditoriaTab logs={logs} />}
              {tab === 'modulos' && <ModulosTab />}
              {tab === 'miembros' && (
                <MiembrosTab
                  org={org} members={members} invites={invites} canManage={canManage} currentUserId={user?.id}
                  onRemove={setToRemove}
                  onRole={async (m, role) => { try { const { updateMemberRole: rows } = await updateMemberRole(m.id, role); setMembers(rows); toast.success('Rol actualizado'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); } }}
                  onCancelInvite={async (inv) => { try { await cancelInvitation(inv.id); setInvites((xs) => xs.filter((x) => x.id !== inv.id)); toast.success('Invitación cancelada'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); } }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />
      <ConfirmDialog open={toRemove !== null} onOpenChange={(v) => !v && setToRemove(null)} title="Eliminar miembro" description={`Se dará de baja a "${toRemove?.fullName ?? ''}".`} onConfirm={confirmRemove} />
    </div>
  );
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

// ---------- Finanzas ----------
function FinanzasTab({ org, canManage, onSave }: { org: Organization; canManage: boolean; onSave: (p: OrgUpdate) => void }) {
  const [f, setF] = useState({
    defaultInterestRate: org.defaultInterestRate ?? 20, defaultInterestMethod: org.defaultInterestMethod ?? 'FLAT',
    defaultFrequency: org.defaultFrequency ?? 'DAILY', defaultTermCount: org.defaultTermCount ?? 20,
    defaultLateFeeType: org.defaultLateFeeType ?? 'NONE', defaultLateFeeValue: org.defaultLateFeeValue ?? 0,
  });
  return (
    <Card><CardContent className="space-y-4 p-5">
      <div><p className="font-extrabold">Finanzas e intereses</p><p className="text-sm text-muted-foreground">Valores por defecto al crear nuevos créditos.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Interés por defecto (%)"><Input type="number" value={f.defaultInterestRate} onChange={(e) => setF({ ...f, defaultInterestRate: Number(e.target.value) })} disabled={!canManage} /></Field>
        <Field label="Método de amortización">
          <Select value={f.defaultInterestMethod} onValueChange={(v) => setF({ ...f, defaultInterestMethod: v })} disabled={!canManage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent></Select>
        </Field>
        <Field label="Frecuencia">
          <Select value={f.defaultFrequency} onValueChange={(v) => setF({ ...f, defaultFrequency: v })} disabled={!canManage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FREQS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent></Select>
        </Field>
        <Field label="Número de cuotas"><Input type="number" value={f.defaultTermCount} onChange={(e) => setF({ ...f, defaultTermCount: Number(e.target.value) })} disabled={!canManage} /></Field>
        <Field label="Tipo de mora">
          <Select value={f.defaultLateFeeType} onValueChange={(v) => setF({ ...f, defaultLateFeeType: v })} disabled={!canManage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LATE_TYPES.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent></Select>
        </Field>
        <Field label={f.defaultLateFeeType === 'PERCENT' ? 'Mora (%)' : 'Mora (monto)'}>
          {f.defaultLateFeeType === 'PERCENT'
            ? <Input type="number" value={f.defaultLateFeeValue} onChange={(e) => setF({ ...f, defaultLateFeeValue: Number(e.target.value) })} disabled={!canManage} />
            : <CurrencyInput value={f.defaultLateFeeValue} onValueChange={(v) => setF({ ...f, defaultLateFeeValue: v })} />}
        </Field>
      </div>
      {canManage && <Button onClick={() => onSave(f)}>Guardar finanzas</Button>}
    </CardContent></Card>
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
function RolesTab() {
  const caps: { label: string; roles: string[] }[] = [
    { label: 'Ver cartera y cobros', roles: ['OWNER', 'ADMIN', 'MANAGER', 'COLLECTOR', 'VIEWER'] },
    { label: 'Registrar abonos', roles: ['OWNER', 'ADMIN', 'MANAGER', 'COLLECTOR'] },
    { label: 'Crear/editar créditos', roles: ['OWNER', 'ADMIN', 'MANAGER', 'COLLECTOR'] },
    { label: 'Gestionar clientes', roles: ['OWNER', 'ADMIN', 'MANAGER', 'COLLECTOR'] },
    { label: 'Gestionar rutas y productos', roles: ['OWNER', 'ADMIN', 'MANAGER'] },
    { label: 'Ver finanzas y reportes', roles: ['OWNER', 'ADMIN', 'MANAGER'] },
    { label: 'Gestionar miembros e invitar', roles: ['OWNER', 'ADMIN'] },
    { label: 'Ajustes de la organización', roles: ['OWNER', 'ADMIN'] },
    { label: 'Eliminar miembros', roles: ['OWNER', 'ADMIN'] },
  ];
  return (
    <Card><CardContent className="p-5">
      <p className="mb-1 font-extrabold">Roles y permisos</p>
      <p className="mb-4 text-sm text-muted-foreground">Qué puede hacer cada rol en la organización.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="border-b-2 border-border">
            <th className="p-2 text-left font-bold">Permiso</th>
            {ROLES.map((r) => <th key={r.value} className="p-2 text-center font-bold">{r.label}</th>)}
          </tr></thead>
          <tbody>
            {caps.map((c) => (
              <tr key={c.label} className="border-b border-border">
                <td className="p-2 font-medium">{c.label}</td>
                {ROLES.map((r) => (
                  <td key={r.value} className="p-2 text-center">
                    {c.roles.includes(r.value) ? <Check className="mx-auto size-4 text-primary" /> : <span className="text-muted-foreground/40">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
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

// ---------- Módulos (config movida) ----------
function ModulosTab() {
  const mods = [
    { href: '/dashboard/rutas', icon: Route, label: 'Rutas', desc: 'Rutas de cobro y cobradores asignados' },
    { href: '/dashboard/productos', icon: Package, label: 'Productos', desc: 'Planes de crédito predefinidos' },
    { href: '/dashboard/etiquetas', icon: Tags, label: 'Etiquetas', desc: 'Clasificación de clientes/créditos' },
    { href: '/dashboard/planes', icon: CreditCard, label: 'Planes y facturación', desc: 'Suscripción y consumo' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mods.map((m) => (
        <Link key={m.href} href={m.href}>
          <Card className="transition-colors hover:bg-accent"><CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><m.icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="font-extrabold leading-tight">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </CardContent></Card>
        </Link>
      ))}
    </div>
  );
}

// ---------- Miembros ----------
function MiembrosTab({ org, members, invites, canManage, currentUserId, onRemove, onRole, onCancelInvite }: {
  org: Organization; members: OrgMember[]; invites: OrgInvitation[]; canManage: boolean; currentUserId?: string;
  onRemove: (m: OrgMember) => void; onRole: (m: OrgMember, role: string) => void; onCancelInvite: (inv: OrgInvitation) => void;
}) {
  return (
    <div className="space-y-4">
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
