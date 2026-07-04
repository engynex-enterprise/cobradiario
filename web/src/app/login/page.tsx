'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { money } from '@/lib/utils';
import { Landmark, Loader2, Radio, Route, Wallet } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('Password123');
  const [loading, setLoading] = useState(false);

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
