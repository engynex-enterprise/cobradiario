'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { verifyEmail, resendVerification } from '@/lib/graphql';
import { Landmark, MailCheck, Loader2, CircleCheckBig, CircleX } from 'lucide-react';

type State = 'pending' | 'verifying' | 'success' | 'error';

export default function VerificarPage() {
  const [state, setState] = useState<State>('pending');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    setEmail(params.get('email') ?? '');
    if (token) {
      setState('verifying');
      verifyEmail(token)
        .then(({ verifyEmail: r }) => { setState('success'); setMessage(r.message); })
        .catch((e) => { setState('error'); setMessage(e instanceof Error ? e.message : 'No se pudo confirmar la cuenta'); });
    }
  }, []);

  async function resend() {
    if (!email) { toast.error('Escribe tu correo en el registro para reenviar'); return; }
    setResending(true);
    try {
      const { resendVerification: r } = await resendVerification(email);
      toast.success(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reenviar');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Landmark className="size-6" /></span>
          <p className="text-lg font-extrabold tracking-tight">Cobro Diario</p>
        </div>

        {state === 'verifying' && (
          <div className="rounded-2xl border-2 border-border p-8">
            <Loader2 className="mx-auto mb-3 size-10 animate-spin text-primary" />
            <p className="font-semibold text-muted-foreground">Confirmando tu cuenta…</p>
          </div>
        )}

        {state === 'success' && (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-8">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"><CircleCheckBig className="size-8" /></div>
            <h1 className="text-2xl font-extrabold">¡Cuenta confirmada! 🎉</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button asChild className="mt-6 h-12 w-full rounded-2xl text-base font-extrabold uppercase tracking-wide"><Link href="/login">Iniciar sesión</Link></Button>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-8">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><CircleX className="size-8" /></div>
            <h1 className="text-2xl font-extrabold">Enlace inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button onClick={resend} disabled={resending || !email} variant="outline" className="mt-6 h-12 w-full rounded-2xl border-2 font-bold">
              {resending && <Loader2 className="h-4 w-4 animate-spin" />} Reenviar correo
            </Button>
          </div>
        )}

        {state === 'pending' && (
          <div className="rounded-2xl border-2 border-border p-8">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MailCheck className="size-8" /></div>
            <h1 className="text-2xl font-extrabold">Revisa tu correo 📩</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Te enviamos un enlace de confirmación{email ? <> a <b className="text-foreground">{email}</b></> : ''}. Ábrelo para activar tu cuenta.
            </p>
            <Button onClick={resend} disabled={resending || !email} variant="outline" className="mt-6 h-12 w-full rounded-2xl border-2 font-bold">
              {resending && <Loader2 className="h-4 w-4 animate-spin" />} Reenviar correo
            </Button>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              <Link href="/login" className="font-extrabold text-primary hover:underline">← Volver al inicio de sesión</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
