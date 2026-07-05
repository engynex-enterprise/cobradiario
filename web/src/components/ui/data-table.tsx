'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ChevronLeft, ChevronRight, MoreVertical, Search, type LucideIcon } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** Valor usado para ordenar (número o texto). */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  danger?: boolean;
  hidden?: (row: T) => boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Texto por fila para el buscador. */
  search?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  empty?: string;
  /** Barra de acciones a la derecha del buscador. */
  toolbar?: React.ReactNode;
  /** Menú contextual (⋮) por fila con acciones (editar, eliminar, etc.). */
  rowActions?: (row: T) => RowAction<T>[];
}

export function DataTable<T>({
  columns,
  rows,
  search,
  searchPlaceholder = 'Buscar…',
  pageSize = 10,
  empty = 'Sin resultados.',
  toolbar,
  rowActions,
}: DataTableProps<T>) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search || !q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => search(r).toLowerCase().includes(needle));
  }, [rows, q, search]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const acc = col.sortValue;
    const out = [...filtered].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return dir === 'asc' ? out : out.reverse();
  }, [filtered, columns, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(current * pageSize, current * pageSize + pageSize);
  const colCount = columns.length + (rowActions ? 1 : 0);

  function toggleSort(col: Column<T>) {
    if (!col.sortable || !col.sortValue) return;
    if (sortKey === col.key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(col.key);
      setDir('asc');
    }
    setPage(0);
  }

  return (
    <div className="space-y-3">
      {(search || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {search ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="w-56 pl-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border-2 border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.className, col.sortable && 'cursor-pointer select-none')}
                  onClick={() => toggleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ArrowUpDown
                        className={cn('h-3.5 w-3.5', sortKey === col.key ? 'text-primary' : 'opacity-40')}
                      />
                    )}
                  </span>
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-12 text-right">Acc.</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-12 text-center text-sm text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="text-right">
                      <RowActionsMenu actions={rowActions(row).filter((a) => !a.hidden?.(row))} row={row} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sorted.length} resultado(s) · página {current + 1} de {pageCount}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={current === 0}
            className="flex size-8 items-center justify-center rounded-lg border-2 border-border disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={current >= pageCount - 1}
            className="flex size-8 items-center justify-center rounded-lg border-2 border-border disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Botón ⋮ con menú contextual en posición fixed que se auto-ubica (arriba/abajo, izq/der). */
function RowActionsMenu<T>({ actions, row }: { actions: RowAction<T>[]; row: T }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) { setOpen(true); return; }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuH = actions.length * 40 + 12; // alto estimado del menú
    const menuW = 192; // w-48
    const style: React.CSSProperties = {};
    // Vertical: abre hacia abajo salvo que no quepa y arriba haya más espacio.
    if (vh - r.bottom < menuH + 8 && r.top > vh - r.bottom) {
      style.bottom = Math.max(8, vh - r.top + 6);
    } else {
      style.top = Math.min(vh - menuH - 8, r.bottom + 6);
    }
    // Horizontal: alinea el borde derecho al botón; si no cabe, alinea a la izquierda.
    if (r.right - menuW < 8) {
      style.left = Math.max(8, r.left);
    } else {
      style.right = Math.max(8, vw - r.right);
    }
    setPos(style);
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        aria-label="Opciones"
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[61] w-48 overflow-hidden rounded-xl border-2 border-border bg-popover p-1 text-popover-foreground shadow-soft-lg"
            style={pos}
          >
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => { setOpen(false); a.onClick(row); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    a.danger ? 'text-destructive hover:bg-destructive/10' : 'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
