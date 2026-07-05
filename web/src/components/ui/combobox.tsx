'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnchoredPopover, getPopoverContainer } from '@/components/ui/use-anchored-popover';

/**
 * Dropdown con buscador (estilo shadcn combobox, sin cmdk).
 * El panel se renderiza en un portal con posición automática (no lo recorta el drawer).
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
  const { open, setOpen, triggerRef, contentRef, style, reposition } = useAnchoredPopover();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
    else setQ('');
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? options.filter((o) => o.toLowerCase().includes(t)) : options;
    return base.slice(0, 100);
  }, [q, options]);

  // Recoloca al cambiar el alto (filtrar / botón "usar…").
  useEffect(() => { if (open) reposition(); }, [filtered.length, open, reposition]);

  const showAdd = allowCustom && q.trim() && !options.some((o) => o.toLowerCase() === q.trim().toLowerCase());

  function pick(v: string) {
    onChange(v);
    setQ('');
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border-2 border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/40 disabled:opacity-50',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>
      {disabled && disabledHint && <p className="mt-1 text-[11px] text-muted-foreground">{disabledHint}</p>}

      {open && !disabled && getPopoverContainer(triggerRef.current) && createPortal(
        <div
          ref={contentRef}
          style={style}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="z-[80] w-56 overflow-hidden rounded-xl border-2 border-border bg-popover shadow-soft-lg"
        >
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
                  <Check className={cn('size-4', value === o ? 'text-primary opacity-100' : 'opacity-0')} />
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
        </div>,
        getPopoverContainer(triggerRef.current)!,
      )}
    </>
  );
}
