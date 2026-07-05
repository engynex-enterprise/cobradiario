'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, MailCheck } from 'lucide-react';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: cablear a la mutación requestPasswordReset (backend + correo InsForge) cuando esté lista.
    setSent(true);
    toast.success('Si el correo existe, te enviaremos instrucciones.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Landmark className="size-6" /></span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">Cobro Diario</p>
            <p className="text-xs font-bold text-muted-foreground">Recuperar contraseña</p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl border-2 border-border p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MailCheck className="size-6" /></div>
            <h1 className="text-xl font-extrabold">Revisa tu correo</h1>
            <p className="mt-2 text-sm text-muted-foreground">Si <b>{email}</b> está registrado, te enviamos un enlace para restablecer tu contraseña.</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">¿Olvidaste tu contraseña?</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Ingresa tu correo y te enviaremos instrucciones para restablecerla.</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label>Correo</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tucorreo@ejemplo.com" className="h-12 rounded-2xl border-2" />
              </div>
              <Button type="submit" className="h-12 w-full rounded-2xl text-base font-extrabold uppercase tracking-wide">Enviar instrucciones</Button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
          <Link href="/login" className="font-extrabold text-primary hover:underline">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
