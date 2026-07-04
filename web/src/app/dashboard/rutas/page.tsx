'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  assignCollector,
  createRoute,
  fetchRoutes,
  fetchTeam,
  type Route,
  type TeamMember,
} from '@/lib/graphql';
import { PageHeader } from '@/components/page-header';
import { MapPin, Plus } from 'lucide-react';

export default function RutasPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [zone, setZone] = useState('');

  const load = useCallback(() => {
    Promise.all([fetchRoutes(), fetchTeam()])
      .then(([r, t]) => {
        setRoutes(r.routes);
        setTeam(t.teamMembers);
      })
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  const collectors = team.filter((m) => m.role === 'COLLECTOR' || m.role === 'MANAGER');

  async function submitRoute(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createRoute({ name, code: code || undefined, zone: zone || undefined });
      toast.success('Ruta creada');
      setName('');
      setCode('');
      setZone('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  async function assign(routeId: string, userId: string) {
    if (!userId) return;
    try {
      await assignCollector(routeId, userId);
      toast.success('Cobrador asignado');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Rutas"
        description="Zonas de cobro que agrupan créditos y se asignan a uno o varios cobradores. Sirven para organizar el trabajo en campo y filtrar la cartera por ruta."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-4 w-4" /> Nueva ruta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitRoute} className="flex flex-wrap items-end gap-2">
            <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required className="w-48" />
            <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
            <Input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} className="w-32" />
            <Button type="submit">Crear</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {routes.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-primary" /> {r.name}
                  {r.code ? <span className="text-xs text-muted-foreground">· {r.code}</span> : null}
                </p>
                {r.zone ? <Badge variant="secondary">{r.zone}</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Cobradores: {r.collectors.map((c) => c.fullName).join(', ') || '—'}
              </p>
              <select
                className="h-9 w-full border border-input bg-background px-2 text-sm"
                defaultValue=""
                onChange={(e) => assign(r.id, e.target.value)}
              >
                <option value="">+ Asignar cobrador…</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        ))}
        {routes.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Aún no hay rutas.</p>
        )}
      </div>
    </div>
  );
}
