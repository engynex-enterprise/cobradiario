'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  fetchOrganization, fetchOrgMembers, fetchPendingInvitations, updateOrganization,
  inviteMember, cancelInvitation, updateMemberRole, removeMember,
  type Organization, type OrgMember, type OrgInvitation,
} from '@/lib/graphql';
import { formatDate } from '@/lib/utils';
import { Building2, Users, MailPlus, Trash2, Loader2, Shield, UserPlus, X } from 'lucide-react';

const ROLES = [
  { value: 'OWNER', label: 'Dueño' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Supervisor' },
  { value: 'COLLECTOR', label: 'Cobrador' },
  { value: 'VIEWER', label: 'Consulta' },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

const MODULE_INFO = {
  summary: 'Tu organización (empresa) y todo lo de sus empleados: miembros, roles, permisos e invitaciones.',
  purpose: 'Gestiona quién puede acceder y con qué rol. Invita cobradores/administradores por correo y controla sus permisos.',
  how: [
    'En "General" editas el nombre de la organización.',
    'En "Miembros" ves a todos, cambias su rol o los quitas.',
    'Invita a alguien nuevo con "Invitar miembro": le llega un correo para unirse.',
    'Las invitaciones pendientes se pueden cancelar mientras no se acepten.',
  ],
  technical: 'La organización es el tenant. Los miembros son Users con una Membership (rol). Invitar crea una Invitation con token; al aceptarla se crea el usuario + membership en este tenant. Todo aislado por RLS: los datos de una organización no se mezclan con otra.',
  plain: 'Es como tu empresa en la app: aquí están tus empleados. Puedes invitar a un cobrador nuevo (le llega un correo), decirle qué puede hacer (su rol) o darlo de baja.',
  tips: ['El Dueño y Administrador pueden invitar y cambiar roles.', 'No puedes cambiarte el rol ni eliminarte a ti mismo.'],
};

export default function OrganizacionPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvitation[]>([]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<OrgMember | null>(null);

  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const load = useCallback(() => {
    fetchOrganization().then((d) => { setOrg(d.organization); setName(d.organization.name); }).catch((e) => toast.error(e.message));
    fetchOrgMembers().then((d) => setMembers(d.organizationMembers)).catch(() => {});
    if (canManage) fetchPendingInvitations().then((d) => setInvites(d.pendingInvitations)).catch(() => {});
  }, [canManage]);
  useEffect(() => load(), [load]);

  async function saveName() {
    if (!name.trim() || name === org?.name) return;
    setSavingName(true);
    try { await updateOrganization(name.trim()); toast.success('Organización actualizada'); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingName(false); }
  }

  async function changeRole(m: OrgMember, role: string) {
    try { const { updateMemberRole: rows } = await updateMemberRole(m.id, role); setMembers(rows); toast.success(`Rol actualizado a ${roleLabel(role)}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }

  async function confirmRemove() {
    if (!toRemove) return;
    try { const { removeMember: rows } = await removeMember(toRemove.id); setMembers(rows); toast.success('Miembro eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); throw e; }
  }

  async function cancel(inv: OrgInvitation) {
    try { await cancelInvitation(inv.id); setInvites((xs) => xs.filter((x) => x.id !== inv.id)); toast.success('Invitación cancelada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Building2}
        title="Organización"
        description="Ajustes de la empresa, miembros, roles e invitaciones."
        info={MODULE_INFO}
        actions={canManage ? <Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" /> Invitar miembro</Button> : undefined}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={<Users className="h-5 w-5" />} label="Miembros" value={String(org?.memberCount ?? members.length)} />
        <Kpi icon={<UserPlus className="h-5 w-5" />} label="Invitaciones pendientes" value={String(invites.length)} />
        <Kpi icon={<Shield className="h-5 w-5" />} label="Tu rol" value={roleLabel(user?.role ?? '')} tone="primary" />
      </section>

      {/* General */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 font-extrabold">General</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label>Nombre de la organización</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} />
            </div>
            {canManage && (
              <Button onClick={saveName} disabled={savingName || !name.trim() || name === org?.name}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar
              </Button>
            )}
          </div>
          {org && <p className="mt-3 text-xs text-muted-foreground">Creada el {formatDate(org.createdAt)}</p>}
        </CardContent>
      </Card>

      {/* Miembros */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 font-extrabold">Miembros</p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{m.fullName} {m.id === user?.id && <span className="text-xs text-muted-foreground">(tú)</span>}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && m.id !== user?.id ? (
                    <Select value={m.role} onValueChange={(v) => changeRole(m, v)}>
                      <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{roleLabel(m.role)}</Badge>
                  )}
                  {canManage && m.id !== user?.id && (
                    <button onClick={() => setToRemove(m)} title="Eliminar" className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invitaciones pendientes */}
      {canManage && invites.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 font-extrabold">Invitaciones pendientes</p>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-border p-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(inv.role)} · invitado por {inv.invitedByName ?? '—'} · vence {formatDate(inv.expiresAt)}</p>
                  </div>
                  <button onClick={() => cancel(inv)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /> Cancelar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(v) => !v && setToRemove(null)}
        title="Eliminar miembro"
        description={`Se dará de baja a "${toRemove?.fullName ?? ''}" de la organización.`}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'primary' }) {
  const cls = tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  return (
    <Card><CardContent className="flex items-center gap-3 p-5">
      <div className={`flex size-11 items-center justify-center rounded-2xl ${cls}`}>{icon}</div>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-xl font-extrabold">{value}</p></div>
    </CardContent></Card>
  );
}

function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COLLECTOR');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await inviteMember(email.trim().toLowerCase(), role);
      toast.success('Invitación enviada por correo');
      setEmail(''); setRole('COLLECTOR'); onClose(); onInvited();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5" /> Invitar miembro</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="empleado@correo.com" /></div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.filter((r) => r.value !== 'OWNER').map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enviar invitación
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
