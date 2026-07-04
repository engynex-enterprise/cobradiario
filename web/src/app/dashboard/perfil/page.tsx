'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { Moon, Sun, LogOut, UserRound, Building2 } from 'lucide-react';

export default function PerfilPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Perfil"
        description="Tu cuenta, la organización a la que perteneces y las preferencias de apariencia (tema claro/oscuro). Desde aquí también puedes cerrar sesión."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5" /> Mi cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Nombre" value={user?.fullName ?? '—'} />
          <Row label="Correo" value={user?.email ?? '—'} />
          <Row label="Rol" value={<Badge variant="secondary">{user?.role}</Badge>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" /> Organización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Tenant ID" value={<span className="font-mono text-xs">{user?.tenantId}</span>} />
          <Row label="Plataforma" value="Cobro Diario · multi-tenant" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Apariencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant={mounted && theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4" /> Claro
            </Button>
            <Button variant={mounted && theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4" /> Oscuro
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="font-semibold">Cerrar sesión</p>
            <p className="text-sm text-muted-foreground">Salir de tu cuenta en este dispositivo.</p>
          </div>
          <Button variant="destructive" onClick={() => { signOut(); router.replace('/login'); }}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
