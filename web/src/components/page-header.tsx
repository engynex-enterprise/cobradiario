'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ModuleInfoButton, type ModuleInfo } from '@/components/module-info';

export interface SectionTab {
  key: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
}

/**
 * Sub-header sticky (fondo blanco) estilo orus-pos SectionHeader: ícono + título +
 * descripción a la izquierda, acciones a la derecha, y pestañas opcionales debajo.
 * Full-bleed dentro del contenedor de la página (se apoya en su padding p-4/p-6).
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  info,
  tabs,
  active,
  onSelect,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  info?: ModuleInfo;
  tabs?: SectionTab[];
  active?: string;
  onSelect?: (key: string) => void;
}) {
  const pathname = usePathname();

  return (
    <div className="sticky -top-4 z-20 -mx-4 -mt-4 mb-6 border-b-2 border-border bg-card sm:-top-6 sm:-mx-6 sm:-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight">{title}</h1>
            {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {(actions || info) && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {info && <ModuleInfoButton info={info} moduleTitle={title} />}
          </div>
        )}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="flex items-stretch gap-1 overflow-x-auto px-4 sm:px-6">
          {tabs.map((t) => {
            const isActive =
              active !== undefined
                ? active === t.key
                : t.href
                  ? pathname === t.href || pathname.startsWith(t.href + '/')
                  : false;
            const cls = cn(
              'relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-bold transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            );
            const inner = (
              <>
                {t.icon && <t.icon className="size-4 shrink-0" />}
                <span>{t.label}</span>
                {isActive && <span className="absolute inset-x-2 -bottom-px h-1 rounded-full bg-primary" />}
              </>
            );
            return onSelect ? (
              <button key={t.key} onClick={() => onSelect(t.key)} className={cls}>{inner}</button>
            ) : (
              <Link key={t.key} href={t.href ?? '#'} className={cls}>{inner}</Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
