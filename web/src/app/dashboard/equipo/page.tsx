'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  assignCollector,
  createRoute,
  createTeamMember,
  fetchRoutes,
  fetchTeam,
  type Route,
  type TeamMember,
} from '@/lib/graphql';
import { ArrowLeft, UserPlus, MapPin } from 'lucide-react';

const ROLES = ['COLLECTOR', 'MANAGER', 'ADMIN', 'VIEWER'] as const;

export default function EquipoPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  const load = useCallback(() => {
    Promise.all([fetchTeam(), fetchRoutes()])
      .then(([t, r]) => {
        setTeam(t.teamMembers);
        setRoutes(r.routes);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const collectors = team.filter((m) => m.role === 'COLLECTOR' || m.role === 'MANAGER');

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/dashboard')}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>
      <h1 className="mb-6 text-2xl font-semibold">Equipo y rutas</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <TeamCard team={team} onChanged={load} />
        <RoutesCard routes={routes} collectors={collectors} onChanged={load} />
      </div>
    </div>
  );
}

function TeamCard({ team, onChanged }: { team: TeamMember[]; onChanged: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('COLLECTOR');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createTeamMember({ fullName, email, password, role });
      toast.success('Usuario creado');
      setFullName('');
      setEmail('');
      setPassword('');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Equipo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-md border">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{m.fullName}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>{m.role}</Badge>
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="space-y-3 rounded-md border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <Input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="Contraseña (mín. 8)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Button type="submit" size="sm" disabled={saving}>Crear</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RoutesCard({
  routes,
  collectors,
  onChanged,
}: {
  routes: Route[];
  collectors: TeamMember[];
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [zone, setZone] = useState('');

  async function submitRoute(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createRoute({ name, code: code || undefined, zone: zone || undefined });
      toast.success('Ruta creada');
      setName('');
      setCode('');
      setZone('');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  async function assign(routeId: string, userId: string) {
    if (!userId) return;
    try {
      await assignCollector(routeId, userId);
      toast.success('Cobrador asignado');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rutas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {routes.map((r) => (
            <li key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {r.name} {r.code ? <span className="text-muted-foreground">· {r.code}</span> : null}
                </p>
                {r.zone ? <Badge variant="secondary">{r.zone}</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cobradores: {r.collectors.map((c) => c.fullName).join(', ') || '—'}
              </p>
              <select
                className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                defaultValue=""
                onChange={(e) => assign(r.id, e.target.value)}
              >
                <option value="">+ Asignar cobrador…</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>

        <form onSubmit={submitRoute} className="space-y-3 rounded-md border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" /> Nueva ruta
          </p>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Código (op.)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Zona (op.)" value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
          <Button type="submit" size="sm" variant="secondary">Crear ruta</Button>
        </form>
      </CardContent>
    </Card>
  );
}
