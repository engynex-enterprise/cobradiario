'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

/** Convierte 'YYYY-MM-DD' a Date local (sin corrimiento por zona horaria). */
function parse(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Selector de fecha estilo shadcn (calendario en popover). value/onChange en 'YYYY-MM-DD'. */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Elegir fecha',
  fromYear = 1920,
  toYear = new Date().getFullYear(),
  disableFuture = false,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  disableFuture?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parse(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const label = selected
    ? selected.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border-2 border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/40',
          !selected && 'text-muted-foreground',
        )}
      >
        <CalendarDays className="size-4 shrink-0 opacity-60" />
        <span className="truncate capitalize">{label}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border-2 border-border bg-popover shadow-soft-lg">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            disabled={disableFuture ? { after: new Date() } : undefined}
            onSelect={(d?: Date) => { if (d) { onChange(fmtISO(d)); setOpen(false); } }}
          />
        </div>
      )}
    </div>
  );
}
