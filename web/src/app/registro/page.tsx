'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, Loader2 } from 'lucide-react';

export default function RegistroPage() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ tenantName: '', fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true);
    try {
      await signUp(form);
      toast.success('¡Cuenta creada! Bienvenido 🎉');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Landmark className="size-6" /></span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">Cobro Diario</p>
            <p className="text-xs font-bold text-muted-foreground">Crea tu cuenta</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">Empieza gratis 🚀</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">Crea tu negocio y administra tu cartera al instante.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre del negocio</Label>
            <Input value={form.tenantName} onChange={set('tenantName')} required placeholder="Créditos La Confianza" className="h-12 rounded-2xl border-2" />
          </div>
          <div className="space-y-1.5">
            <Label>Tu nombre</Label>
            <Input value={form.fullName} onChange={set('fullName')} required placeholder="Juan Pérez" className="h-12 rounded-2xl border-2" />
          </div>
          <div className="space-y-1.5">
            <Label>Correo</Label>
            <Input type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="tucorreo@ejemplo.com" className="h-12 rounded-2xl border-2" />
          </div>
          <div className="space-y-1.5">
            <Label>Contraseña</Label>
            <Input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="h-12 rounded-2xl border-2" />
          </div>
          <Button type="submit" className="h-12 w-full rounded-2xl text-base font-extrabold uppercase tracking-wide" disabled={loading}>
            {loading && <Loader2 className="h-5 w-5 animate-spin" />} Crear cuenta
          </Button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-extrabold text-primary hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
