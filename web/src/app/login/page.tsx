'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { money } from '@/lib/utils';
import { insforge, GOOGLE_ENABLED } from '@/lib/insforge';
import { Landmark, Loader2, Radio, Route, Wallet } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('Password123');
  const [loading, setLoading] = useState(false);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Izquierda: formulario */}
      <div className="flex w-full flex-col lg:w-[46%]">
        <div className="flex flex-1 flex-col px-6 py-7 sm:px-10 lg:px-16">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
              <Landmark className="size-6" />
            </span>
            <div className="leading-tight">
              <p className="font-extrabold text-foreground">Cobro Diario</p>
              <p className="text-xs font-medium text-muted-foreground">Plataforma de cobranza</p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <h1 className="text-2xl font-bold tracking-tight">Inicia sesión</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ingresa a tu panel de gestión.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>

            {GOOGLE_ENABLED && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={signInGoogle}>
                  <GoogleIcon /> Continuar con Google
                </Button>
              </>
            )}

            <p className="mt-6 border border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
              Demo · owner@demo.com / Password123
            </p>
          </div>

          <p className="text-center text-xs font-medium text-muted-foreground">
            © 2026 Cobro Diario · Engynex
          </p>
        </div>
      </div>

      {/* Derecha: showcase de marca */}
      <div className="relative hidden overflow-hidden lg:block lg:w-[54%]">
        <Showcase />
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[linear-gradient(150deg,#0a63c2_0%,#004f9f_55%,#06284f_100%)] p-10 text-white xl:p-12">
      <div className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-36 -left-24 size-[26rem] rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur">
          <Landmark className="size-3.5" /> Cobro diario · gota a gota
        </span>
        <h2 className="mt-5 text-[2.1rem] font-extrabold leading-tight tracking-tight">
          Cobra al día, sin planillas
        </h2>
        <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/85">
          Créditos, rutas, abonos y arqueo de caja en una sola plataforma — en tiempo real y
          con motor de intereses configurable.
        </p>
      </div>

      {/* Mock de la cartera */}
      <div className="relative z-10 mx-auto my-6 w-full max-w-md">
        <div className="overflow-hidden border-2 border-white/30 bg-white text-slate-800 shadow-[0_24px_55px_-14px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-1.5 border-b-2 border-slate-100 bg-slate-50 px-3 py-2">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="mx-auto rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[9px] font-bold text-slate-400">
              Cobro Diario · Cartera
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Cartera" value={money(4560000)} />
              <MiniStat label="Hoy" value={money(240000)} />
              <MiniStat label="Activos" value="18" />
            </div>
            <div className="flex h-20 items-end gap-1.5 border-t border-slate-100 pt-3">
              {[40, 62, 35, 78, 54, 90, 68].map((h, i) => (
                <div key={i} className="flex-1 bg-[#004f9f]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-x-6 gap-y-3">
        <Feature icon={Radio} label="Tiempo real" />
        <Feature icon={Route} label="Rutas y cobradores" />
        <Feature icon={Wallet} label="Caja y arqueo" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-100 bg-slate-50 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Radio; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
      <Icon className="size-4" /> {label}
    </div>
  );
}
