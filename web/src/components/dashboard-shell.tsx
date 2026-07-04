'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  HandCoins,
  Banknote,
  CalendarCheck,
  ArrowLeftRight,
  Receipt,
  Coins,
  Scale,
  Layers,
  Route,
  Network,
  Package,
  Tags,
  BellRing,
  Bell,
  MessageCircle,
  BarChart3,
  UserRound,
  Landmark,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: Home },
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/prestamos', label: 'Préstamos', icon: HandCoins },
      { href: '/dashboard/pagos', label: 'Pagos', icon: Banknote },
      { href: '/dashboard/cobro', label: 'Cobro del día', icon: CalendarCheck },
    ],
  },
  {
    section: 'Finanzas',
    items: [
      { href: '/dashboard/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
      { href: '/dashboard/gastos', label: 'Gastos', icon: Receipt },
      { href: '/dashboard/caja', label: 'Caja', icon: Coins },
      { href: '/dashboard/balances', label: 'Balances', icon: Scale },
      { href: '/dashboard/bases', label: 'Bases', icon: Layers },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { href: '/dashboard/rutas', label: 'Rutas', icon: Route },
      { href: '/dashboard/equipo', label: 'Equipo', icon: Network },
      { href: '/dashboard/productos', label: 'Productos', icon: Package },
      { href: '/dashboard/etiquetas', label: 'Etiquetas', icon: Tags },
    ],
  },
  {
    section: 'Comunicación',
    items: [
      { href: '/dashboard/recordatorios', label: 'Recordatorios', icon: BellRing },
      { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: Bell },
      { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
    ],
  },
  {
    section: 'Análisis',
    items: [{ href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 }],
  },
  {
    section: 'Cuenta',
    items: [{ href: '/dashboard/perfil', label: 'Perfil', icon: UserRound }],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/prestamos')
    return pathname.startsWith('/dashboard/prestamos') || pathname.startsWith('/dashboard/loan');
  return pathname === href || pathname.startsWith(href + '/');
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shadow-header flex h-16 shrink-0 items-center gap-2 border-b-2 border-border bg-card px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <Landmark className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-foreground">Cobro Diario</span>
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
        <div className="flex items-center gap-3 border-l-2 border-border pl-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <button
            onClick={() => {
              signOut();
              router.replace('/login');
            }}
            title="Cerrar sesión"
            className="flex size-10 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r-2 border-border bg-sidebar md:flex">
          <nav className="flex-1 space-y-4 overflow-y-auto p-3">
            {NAV.map((group) => (
              <div key={group.section} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.section}
                </p>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 border-2 px-3 py-2 text-[13px] font-bold uppercase tracking-wide transition-colors',
                        active
                          ? 'border-sky-300 bg-accent text-accent-foreground'
                          : 'border-transparent text-sidebar-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="border-t-2 border-sidebar-border p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Plataforma de cobro diario</p>
            <p>v0.1 · multi-tenant</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-1 overflow-x-auto border-b-2 border-border bg-card px-2 py-1.5 md:hidden">
            {FLAT.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'whitespace-nowrap px-3 py-1.5 text-xs font-bold uppercase',
                    active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <main className="app-canvas min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
