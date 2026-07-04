'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  Home, Users, HandCoins, Banknote, CalendarCheck, ArrowLeftRight, Receipt, Coins, Scale,
  Layers, Route, Network, Package, Tags, BellRing, Bell, MessageCircle, BarChart3, UserRound,
  Landmark, LogOut, Wallet, Settings, MessagesSquare, ChevronDown, ChevronsUpDown, Search,
  PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from 'lucide-react';

type NavLink = { kind: 'link'; href: string; label: string; icon: LucideIcon; keywords?: string };
type NavGroup = { kind: 'group'; label: string; icon: LucideIcon; children: { href: string; label: string }[] };
type NavNode = NavLink | NavGroup;

const NAV: NavNode[] = [
  { kind: 'link', href: '/dashboard', label: 'Inicio', icon: Home, keywords: 'home dashboard' },
  {
    kind: 'group', label: 'Cartera', icon: HandCoins,
    children: [
      { href: '/dashboard/clientes', label: 'Clientes' },
      { href: '/dashboard/prestamos', label: 'Préstamos' },
      { href: '/dashboard/pagos', label: 'Pagos' },
      { href: '/dashboard/cobro', label: 'Cobro del día' },
    ],
  },
  {
    kind: 'group', label: 'Finanzas', icon: Wallet,
    children: [
      { href: '/dashboard/movimientos', label: 'Movimientos' },
      { href: '/dashboard/gastos', label: 'Gastos' },
      { href: '/dashboard/caja', label: 'Caja' },
      { href: '/dashboard/balances', label: 'Balances' },
      { href: '/dashboard/bases', label: 'Bases' },
    ],
  },
  {
    kind: 'group', label: 'Gestión', icon: Settings,
    children: [
      { href: '/dashboard/rutas', label: 'Rutas' },
      { href: '/dashboard/equipo', label: 'Equipo' },
      { href: '/dashboard/productos', label: 'Productos' },
      { href: '/dashboard/etiquetas', label: 'Etiquetas' },
    ],
  },
  {
    kind: 'group', label: 'Comunicación', icon: MessagesSquare,
    children: [
      { href: '/dashboard/recordatorios', label: 'Recordatorios' },
      { href: '/dashboard/notificaciones', label: 'Notificaciones' },
      { href: '/dashboard/chat', label: 'Chat' },
    ],
  },
  { kind: 'link', href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3, keywords: 'resumen analitica' },
];

const ICON_BY_HREF: Record<string, LucideIcon> = {
  '/dashboard/clientes': Users, '/dashboard/prestamos': HandCoins, '/dashboard/pagos': Banknote,
  '/dashboard/cobro': CalendarCheck, '/dashboard/movimientos': ArrowLeftRight, '/dashboard/gastos': Receipt,
  '/dashboard/caja': Coins, '/dashboard/balances': Scale, '/dashboard/bases': Layers, '/dashboard/rutas': Route,
  '/dashboard/equipo': Network, '/dashboard/productos': Package, '/dashboard/etiquetas': Tags,
  '/dashboard/recordatorios': BellRing, '/dashboard/notificaciones': Bell, '/dashboard/chat': MessageCircle,
};

const FLAT: { href: string; label: string; icon: LucideIcon; keywords: string }[] = NAV.flatMap((n) =>
  n.kind === 'link'
    ? [{ href: n.href, label: n.label, icon: n.icon, keywords: n.keywords ?? '' }]
    : n.children.map((c) => ({ href: c.href, label: c.label, icon: ICON_BY_HREF[c.href] ?? Home, keywords: n.label.toLowerCase() })),
);

function linkActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/prestamos') return pathname.startsWith('/dashboard/prestamos') || pathname.startsWith('/dashboard/loan');
  return pathname === href || pathname.startsWith(href + '/');
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header: logo (izq) · buscador (centro) · apps/notif (der) */}
      <header className="shadow-header flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2.5 pl-1 pr-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Landmark className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Cobro Diario</span>
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            title="Contraer menú"
            className="hidden size-11 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:flex"
          >
            {collapsed ? <PanelLeftOpen className="size-6" /> : <PanelLeftClose className="size-6" />}
          </button>
        </div>
        <div className="flex flex-[2] justify-center">
          <GlobalSearch />
        </div>
        <div className="flex flex-1 items-center justify-end gap-1.5">
          <button title="Notificaciones" onClick={() => router.push('/dashboard/notificaciones')} className="flex size-11 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Bell className="size-6" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar único colapsable con grupos expandibles */}
        <aside className={cn('hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex', collapsed ? 'w-[4.5rem]' : 'w-72')}>
          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2">
            {NAV.map((node) =>
              node.kind === 'link' ? (
                <SidebarLink key={node.href} href={node.href} label={node.label} icon={node.icon} active={linkActive(pathname, node.href)} collapsed={collapsed} />
              ) : (
                <SidebarGroup key={node.label} group={node} pathname={pathname} collapsed={collapsed} />
              ),
            )}
          </nav>
          <div className="space-y-0.5 border-t border-sidebar-border p-3">
            <SidebarLink href="/dashboard/perfil" label="Perfil" icon={UserRound} active={linkActive(pathname, '/dashboard/perfil')} collapsed={collapsed} />
            <UserMenu name={user.fullName} email={user.email} role={user.role} collapsed={collapsed} onLogout={() => { signOut(); router.replace('/login'); }} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Nav horizontal en móvil */}
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-1.5 md:hidden">
            {FLAT.map((item) => (
              <Link key={item.href} href={item.href} className={cn('whitespace-nowrap px-3 py-1.5 text-xs font-bold uppercase', linkActive(pathname, item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}>
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="app-canvas min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ href, label, icon: Icon, active, collapsed }: { href: string; label: string; icon: LucideIcon; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border-2 py-2.5 text-[13px] font-extrabold uppercase tracking-wide transition-colors',
        collapsed ? 'justify-center px-0' : 'px-3',
        active ? 'border-sky-300 bg-accent text-accent-foreground' : 'border-transparent text-foreground/70 hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-6 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  );
}

function SidebarGroup({ group, pathname, collapsed }: { group: NavGroup; pathname: string; collapsed: boolean }) {
  const hasActive = group.children.some((c) => linkActive(pathname, c.href));
  const [open, setOpen] = useState(hasActive);
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
  const Icon = group.icon;

  if (collapsed) {
    return (
      <Link href={group.children[0]?.href ?? '#'} title={group.label} className={cn('flex items-center justify-center rounded-2xl border-2 border-transparent py-2.5 transition-colors hover:bg-muted', hasActive ? 'text-accent-foreground' : 'text-foreground/70 hover:text-foreground')}>
        <Icon className="size-6" />
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('flex w-full items-center gap-3 rounded-2xl border-2 border-transparent px-3 py-2.5 text-[13px] font-extrabold uppercase tracking-wide transition-colors', hasActive ? 'text-accent-foreground' : 'text-foreground/70 hover:bg-muted hover:text-foreground')}
      >
        <Icon className="size-6 shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown className={cn('size-5 shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="my-1 ml-7 space-y-0.5 border-l-2 border-border pl-3">
          {group.children.map((c) => {
            const active = linkActive(pathname, c.href);
            return (
              <li key={c.href}>
                <Link href={c.href} className={cn('block rounded-xl px-3 py-2 text-[13px] font-bold transition-colors', active ? 'bg-accent text-accent-foreground' : 'text-foreground/60 hover:bg-muted hover:text-foreground')}>
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UserMenu({ name, email, role, collapsed, onLogout }: { name: string; email: string; role: string; collapsed: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} title={name} className={cn('flex w-full items-center gap-2.5 rounded-2xl text-left outline-none transition-colors hover:bg-sidebar-accent', collapsed ? 'justify-center p-1.5' : 'p-2')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">{initials || '?'}</span>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name || 'Usuario'}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border-2 border-border bg-popover text-popover-foreground shadow-soft-lg">
          <div className="flex items-center gap-3 border-b-2 border-border px-3 py-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{initials || '?'}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name || 'Usuario'}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{role?.toLowerCase()}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link href="/dashboard/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground">
              <UserRound className="size-4" /> Mi perfil
            </Link>
            <Link href="/dashboard/reportes" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground">
              <BarChart3 className="size-4" /> Reportes
            </Link>
            <button onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Buscador global (paleta ⌘K) — igual que orus-pos */
function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return FLAT;
    return FLAT.filter((i) => i.label.toLowerCase().includes(t) || i.keywords.includes(t));
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setQ(''); setActive(0); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <>
      <button onClick={() => { setQ(''); setActive(0); setOpen(true); }} className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border-2 border-border bg-background px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent">
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar módulos…</span>
        <kbd className="hidden rounded-md border-2 border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold sm:inline">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-border bg-popover text-popover-foreground shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b-2 border-border px-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  else if (e.key === 'Enter' && results[active]) go(results[active].href);
                }}
                placeholder="Buscar módulos, secciones…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
              ) : (
                results.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <button key={r.href} onMouseEnter={() => setActive(i)} onClick={() => go(r.href)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors', i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60')}>
                      <Icon className="size-4 shrink-0" />
                      {r.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
