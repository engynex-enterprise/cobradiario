'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Building2, SlidersHorizontal, Coins, Bell, Users, Shield, ScrollText,
  Route, Package, Tags, CreditCard, type LucideIcon,
} from 'lucide-react';

export const SETTINGS_SECTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'general', label: 'General', icon: SlidersHorizontal },
  { key: 'politicas', label: 'Políticas', icon: Coins },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { key: 'miembros', label: 'Miembros', icon: Users },
  { key: 'roles', label: 'Roles y permisos', icon: Shield },
  { key: 'auditoria', label: 'Auditoría', icon: ScrollText },
];
export const SETTINGS_MODULES: { key: string; href: string; label: string; icon: LucideIcon }[] = [
  { key: 'rutas', href: '/dashboard/rutas', label: 'Rutas', icon: Route },
  { key: 'productos', href: '/dashboard/productos', label: 'Productos', icon: Package },
  { key: 'etiquetas', href: '/dashboard/etiquetas', label: 'Etiquetas', icon: Tags },
  { key: 'planes', href: '/dashboard/planes', label: 'Planes y facturación', icon: CreditCard },
];

/** Layout de ajustes con sub-sidebar persistente (secciones de organización + módulos). */
export function SettingsShell({ active, title, children }: { active: string; title?: string; children: React.ReactNode }) {
  const itemCls = 'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-[13px] font-bold transition-colors';
  const activeCls = 'border-sky-300 bg-accent text-accent-foreground';
  const idleCls = 'border-transparent text-foreground/70 hover:bg-muted hover:text-foreground';
  const mob = (a: boolean) => cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold uppercase', a ? 'bg-accent text-accent-foreground' : 'text-muted-foreground');

  return (
    <div className="flex min-h-[calc(100dvh-4rem)]">
      <aside className="sticky top-0 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col border-r-2 border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 border-b-2 border-sidebar-border p-4">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="size-5" /></span>
          <div className="min-w-0"><p className="truncate text-sm font-extrabold">{title ?? 'Ajustes'}</p><p className="text-[11px] text-muted-foreground">Configuración</p></div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {SETTINGS_SECTIONS.map((s) => (
            <Link key={s.key} href={`/dashboard/organizacion?s=${s.key}`} className={cn(itemCls, active === s.key ? activeCls : idleCls)}>
              <s.icon className="size-5 shrink-0" /><span className="flex-1 text-left">{s.label}</span>
            </Link>
          ))}
          <p className="px-3 pb-1 pt-4 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Módulos</p>
          {SETTINGS_MODULES.map((m) => (
            <Link key={m.key} href={m.href} className={cn(itemCls, active === m.key ? activeCls : idleCls)}>
              <m.icon className="size-5 shrink-0" /><span className="flex-1 text-left">{m.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="flex gap-1 overflow-x-auto border-b-2 border-border bg-card px-2 py-2 md:hidden">
          {SETTINGS_SECTIONS.map((s) => <Link key={s.key} href={`/dashboard/organizacion?s=${s.key}`} className={mob(active === s.key)}>{s.label}</Link>)}
          {SETTINGS_MODULES.map((m) => <Link key={m.key} href={m.href} className={mob(active === m.key)}>{m.label}</Link>)}
        </nav>
        {children}
      </div>
    </div>
  );
}
