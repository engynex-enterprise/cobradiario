'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';

export default function InvitacionPage() {
  const { acceptInvite } = useAuth();
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true);
    try {
      await acceptInvite({ token, fullName, password });
      toast.success('¡Bienvenido a la organización! 🎉');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo aceptar la invitación');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Building2 className="size-6" /></span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">Cobro Diario</p>
            <p className="text-xs font-bold text-muted-foreground">Invitación a una organización</p>
          </div>
        </div>

        {!token ? (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-extrabold">Enlace inválido</p>
            <p className="mt-1 text-sm text-muted-foreground">Falta el código de invitación.</p>
            <Link href="/login" className="mt-4 inline-block font-extrabold text-primary hover:underline">Ir al inicio de sesión</Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Únete al equipo 🤝</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Completa tus datos para aceptar la invitación y crear tu acceso.</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5"><Label>Tu nombre</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Juan Pérez" className="h-12 rounded-2xl border-2" /></div>
              <div className="space-y-1.5"><Label>Contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="h-12 rounded-2xl border-2" /></div>
              <Button type="submit" className="h-12 w-full rounded-2xl text-base font-extrabold uppercase tracking-wide" disabled={loading}>
                {loading && <Loader2 className="h-5 w-5 animate-spin" />} Aceptar invitación
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
