'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { insforge, GOOGLE_ENABLED } from '@/lib/insforge';
import { Landmark, Loader2, HandCoins, Route, Wallet, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (msg.includes('EMAIL_NOT_VERIFIED') || msg.toLowerCase().includes('confirmar tu correo')) {
        toast.error('Debes confirmar tu correo para entrar.');
        router.push(`/verificar?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    try {
      await insforge.auth.signInWithOAuth('google', {
        redirectTo: `${window.location.origin}/auth/callback`,
        additionalParams: { prompt: 'select_account' },
      });
    } catch {
      toast.error('No se pudo iniciar sesión con Google');
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Izquierda: formulario */}
      <div className="flex w-full flex-col lg:w-[46%]">
        <div className="flex flex-1 flex-col px-6 py-7 sm:px-10 lg:px-16">
          <div className="flex items-center gap-2.5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_4px_0_0] shadow-[color:var(--primary-strong,#46a302)]">
              <Landmark className="size-6" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight text-foreground">Cobro Diario</p>
              <p className="text-xs font-bold text-muted-foreground">Plataforma de cobranza</p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <h1 className="text-3xl font-extrabold tracking-tight">¡Hola de nuevo! 👋</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Ingresa para gestionar tu cartera al día.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="tucorreo@ejemplo.com" className="h-12 rounded-2xl border-2" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link href="/recuperar" className="text-xs font-bold text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" className="h-12 rounded-2xl border-2" />
              </div>
              <Button type="submit" className="h-12 w-full rounded-2xl text-base font-extrabold uppercase tracking-wide" disabled={loading}>
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>

            {GOOGLE_ENABLED && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <span className="h-0.5 flex-1 rounded bg-border" /> o <span className="h-0.5 flex-1 rounded bg-border" />
                </div>
                <Button type="button" variant="outline" className="h-12 w-full rounded-2xl border-2 text-base font-bold" onClick={signInGoogle}>
                  <GoogleIcon /> Continuar con Google
                </Button>
              </>
            )}

            <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="font-extrabold text-primary hover:underline">Crear cuenta</Link>
            </p>
          </div>

          <p className="text-center text-xs font-bold text-muted-foreground">© 2026 Cobro Diario · Engynex</p>
        </div>
      </div>

      {/* Derecha: showcase Duolingo */}
      <div className="relative hidden overflow-hidden lg:block lg:w-[54%]">
        <Showcase />
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#7bd92e_0%,#58cc02_50%,#46a302_100%)] p-10 text-white xl:p-14">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-[26rem] rounded-full bg-black/5 blur-3xl" />

      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide backdrop-blur">
          <HandCoins className="size-3.5" /> Gota a gota · sin planillas
        </span>
        <h2 className="mt-6 text-[2.4rem] font-extrabold leading-[1.1] tracking-tight">
          Cobra al día,<br />gana en orden.
        </h2>
        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-white/90">
          Créditos, rutas, abonos y arqueo de caja en una sola plataforma — en tiempo real y con motor de intereses configurable.
        </p>
      </div>

      {/* Mock chunky de la cartera */}
      <div className="relative z-10 mx-auto my-6 w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border-4 border-white/30 bg-white text-slate-800 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-1.5 border-b-2 border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="mx-auto rounded-full border-2 border-slate-200 bg-white px-3 py-0.5 text-[10px] font-extrabold text-slate-400">Cobro Diario</span>
          </div>
          <div className="space-y-3 p-5">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Cartera" value="$4.5M" />
              <MiniStat label="Hoy" value="$240k" />
              <MiniStat label="Activos" value="18" />
            </div>
            <div className="flex h-24 items-end gap-2 border-t-2 border-slate-100 pt-4">
              {[40, 62, 35, 78, 54, 90, 68].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-lg bg-[#58cc02]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-x-6 gap-y-3">
        <Feature icon={Wallet} label="Caja y arqueo" />
        <Feature icon={Route} label="Rutas y cobradores" />
        <Feature icon={ShieldCheck} label="Score de riesgo" />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 px-2.5 py-2">
      <p className="text-[9px] font-extrabold uppercase text-slate-400">{label}</p>
      <p className="text-sm font-extrabold text-slate-800">{value}</p>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Route; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-extrabold text-white/95">
      <span className="flex size-8 items-center justify-center rounded-xl bg-white/20"><Icon className="size-4" /></span> {label}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
