'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTeamMember, fetchTeam, type TeamMember } from '@/lib/graphql';
import { UserPlus } from 'lucide-react';

const ROLES = ['COLLECTOR', 'MANAGER', 'ADMIN', 'VIEWER'] as const;

export default function EquipoPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  const load = useCallback(() => {
    fetchTeam()
      .then((d) => setTeam(d.teamMembers))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Equipo"
        description="Usuarios de tu organización y sus roles (dueño, administrador, supervisor, cobrador). Crea cobradores para asignarlos a rutas y que registren abonos desde la app."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuarios ({team.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {team.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <NewMember onCreated={load} />
    </div>
  );
}

function NewMember({ onCreated }: { onCreated: () => void }) {
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
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" /> Nuevo usuario
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Contraseña (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Button type="submit" size="sm" disabled={saving}>Crear usuario</Button>
        </form>
      </CardContent>
    </Card>
  );
}
