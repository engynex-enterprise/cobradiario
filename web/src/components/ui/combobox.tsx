'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropdown con buscador (estilo shadcn combobox, sin cmdk).
 * Permite escribir valores nuevos si `allowCustom` (útil para ciudad/barrio).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  allowCustom = true,
  disabled = false,
  disabledHint,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    setTimeout(() => inputRef.current?.focus(), 20);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? options.filter((o) => o.toLowerCase().includes(t)) : options;
    return base.slice(0, 100);
  }, [q, options]);

  const showAdd = allowCustom && q.trim() && !options.some((o) => o.toLowerCase() === q.trim().toLowerCase());

  function pick(v: string) {
    onChange(v);
    setQ('');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border-2 border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/40 disabled:opacity-50',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border-2 border-border bg-popover shadow-soft-lg">
          <div className="flex items-center gap-2 border-b-2 border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && !showAdd ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => pick(o)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    value === o && 'bg-accent/60',
                  )}
                >
                  <Check className={cn('size-4', value === o ? 'opacity-100 text-primary' : 'opacity-0')} />
                  {o}
                </button>
              ))
            )}
            {showAdd && (
              <button
                type="button"
                onClick={() => pick(q.trim())}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                <Check className="size-4 opacity-0" /> Usar «{q.trim()}»
              </button>
            )}
          </div>
        </div>
      )}
      {disabled && disabledHint && <p className="mt-1 text-[11px] text-muted-foreground">{disabledHint}</p>}
    </div>
  );
}
