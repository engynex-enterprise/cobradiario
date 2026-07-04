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
  LayoutGrid,
  Wallet,
  Settings,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavGroup {
  section: string;
  icon: LucideIcon;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    section: 'Principal',
    icon: LayoutGrid,
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
    icon: Wallet,
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
    icon: Settings,
    items: [
      { href: '/dashboard/rutas', label: 'Rutas', icon: Route },
      { href: '/dashboard/equipo', label: 'Equipo', icon: Network },
      { href: '/dashboard/productos', label: 'Productos', icon: Package },
      { href: '/dashboard/etiquetas', label: 'Etiquetas', icon: Tags },
    ],
  },
  {
    section: 'Comunicación',
    icon: MessagesSquare,
    items: [
      { href: '/dashboard/recordatorios', label: 'Recordatorios', icon: BellRing },
      { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: Bell },
      { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
    ],
  },
  {
    section: 'Análisis',
    icon: BarChart3,
    items: [{ href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 }],
  },
  {
    section: 'Cuenta',
    icon: UserRound,
    items: [{ href: '/dashboard/perfil', label: 'Perfil', icon: UserRound }],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

function itemActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/prestamos')
    return pathname.startsWith('/dashboard/prestamos') || pathname.startsWith('/dashboard/loan');
  return pathname === href || pathname.startsWith(href + '/');
}

function activeGroupIndex(pathname: string) {
  const idx = NAV.findIndex((g) => g.items.some((it) => itemActive(pathname, it.href)));
  return idx === -1 ? 0 : idx;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  const groupIdx = activeGroupIndex(pathname);
  const group = NAV[groupIdx];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
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
            className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Riel de secciones (primer sidebar) */}
        <nav className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r-2 border-border bg-sidebar py-3 md:flex">
          {NAV.map((g, i) => {
            const Icon = g.icon;
            const active = i === groupIdx;
            return (
              <Link
                key={g.section}
                href={g.items[0].href}
                title={g.section}
                className={cn(
                  'flex size-11 flex-col items-center justify-center border-2 transition-colors',
                  active
                    ? 'border-sky-300 bg-accent text-accent-foreground'
                    : 'border-transparent text-sidebar-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-5" />
              </Link>
            );
          })}
        </nav>

        {/* Sub-navegación de la sección (segundo sidebar) */}
        <aside className="hidden w-56 shrink-0 flex-col border-r-2 border-border bg-sidebar md:flex">
          <div className="border-b-2 border-sidebar-border px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sección</p>
            <p className="text-sm font-extrabold text-foreground">{group.section}</p>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {group.items.map((item) => {
              const active = itemActive(pathname, item.href);
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
          </nav>
          <div className="border-t-2 border-sidebar-border p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Cobro Diario</p>
            <p>v0.1 · multi-tenant</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Nav horizontal en móvil */}
          <nav className="flex gap-1 overflow-x-auto border-b-2 border-border bg-card px-2 py-1.5 md:hidden">
            {FLAT.map((item) => {
              const active = itemActive(pathname, item.href);
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
