'use client';

import { useMemo, useState } from 'react';
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
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** Valor usado para ordenar (número o texto). */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
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
}

export function DataTable<T>({
  columns,
  rows,
  search,
  searchPlaceholder = 'Buscar…',
  pageSize = 10,
  empty = 'Sin resultados.',
  toolbar,
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

      <div className="overflow-hidden rounded-xl border-2 border-border bg-card">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
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
