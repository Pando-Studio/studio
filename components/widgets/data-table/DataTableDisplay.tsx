'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import {
  Table,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { WidgetDisplayProps } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataTableColumn {
  id: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

interface DataTableData {
  title?: string;
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  exportUrl?: string;
}

type SortDirection = 'asc' | 'desc' | null;

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

// ---------------------------------------------------------------------------
// Cell formatting
// ---------------------------------------------------------------------------

function formatCell(value: unknown, type?: string): string | null {
  if (value == null || value === '') return null;
  if (type === 'date') {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }
  return String(value);
}

function isBooleanish(value: unknown): boolean {
  if (typeof value === 'boolean') return true;
  const s = String(value).toLowerCase();
  return s === 'true' || s === 'false' || s === 'oui' || s === 'non' || s === 'yes' || s === 'no';
}

function toBool(value: unknown): boolean {
  const s = String(value).toLowerCase();
  return s === 'true' || s === 'oui' || s === 'yes' || s === '1';
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportCsv(columns: DataTableColumn[], rows: Record<string, unknown>[], title?: string) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const v = String(row[c.id] ?? '').replace(/"/g, '""');
        return `"${v}"`;
      })
      .join(','),
  );
  const csv = [header, ...body].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title ?? 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTableDisplay({ data }: WidgetDisplayProps) {
  const tableData = data as unknown as DataTableData;

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // ---- Sort handler ---
  const handleSort = useCallback(
    (columnId: string) => {
      if (sortColumn === columnId) {
        if (sortDir === 'asc') {
          setSortDir('desc');
        } else {
          setSortColumn(null);
          setSortDir(null);
        }
      } else {
        setSortColumn(columnId);
        setSortDir('asc');
      }
      setPage(0);
    },
    [sortColumn, sortDir],
  );

  // ---- Filter ----
  const filteredRows = useMemo(() => {
    const rows = tableData.rows ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      tableData.columns.some((col) =>
        String(row[col.id] ?? '').toLowerCase().includes(q),
      ),
    );
  }, [tableData.rows, tableData.columns, search]);

  // ---- Sort ----
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDir) return filteredRows;
    const col = tableData.columns.find((c) => c.id === sortColumn);
    return [...filteredRows].sort((a, b) => {
      const aRaw = a[sortColumn];
      const bRaw = b[sortColumn];

      // Number sort
      if (col?.type === 'number') {
        const an = Number(aRaw);
        const bn = Number(bRaw);
        if (!isNaN(an) && !isNaN(bn)) {
          return sortDir === 'asc' ? an - bn : bn - an;
        }
      }

      // Date sort
      if (col?.type === 'date') {
        const ad = new Date(String(aRaw ?? '')).getTime();
        const bd = new Date(String(bRaw ?? '')).getTime();
        if (!isNaN(ad) && !isNaN(bd)) {
          return sortDir === 'asc' ? ad - bd : bd - ad;
        }
      }

      // Default: locale compare
      const aVal = String(aRaw ?? '');
      const bVal = String(bRaw ?? '');
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortColumn, sortDir, tableData.columns]);

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    if (sortedRows.length <= pageSize) return sortedRows;
    const start = page * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  // Reset page when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  if (!tableData.columns?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune donnee disponible.
      </div>
    );
  }

  const needsPagination = sortedRows.length > PAGE_SIZE_OPTIONS[0];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {tableData.title && (
            <>
              <Table className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-lg font-semibold">{tableData.title}</h3>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => exportCsv(tableData.columns, sortedRows, tableData.title)}
        >
          <Download className="h-3 w-3" />
          Exporter CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans le tableau..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {tableData.columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'px-4 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap',
                    col.type === 'number' ? 'text-right' : 'text-left',
                  )}
                  onClick={() => handleSort(col.id)}
                >
                  <div className={cn('flex items-center gap-1', col.type === 'number' && 'justify-end')}>
                    {col.label}
                    {sortColumn === col.id ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rIndex) => (
              <tr
                key={rIndex}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                {tableData.columns.map((col) => {
                  const raw = row[col.id];
                  const isBool = col.type === 'boolean' || isBooleanish(raw);

                  return (
                    <td
                      key={col.id}
                      className={cn(
                        'px-4 py-2',
                        col.type === 'number' && 'text-right tabular-nums',
                        isBool && 'text-center',
                      )}
                    >
                      {isBool ? (
                        toBool(raw) ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">--</span>
                        )
                      ) : (
                        formatCell(raw, col.type) ?? (
                          <span className="text-muted-foreground/40">--</span>
                        )
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={tableData.columns.length}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {search ? 'Aucun resultat pour cette recherche.' : 'Aucune ligne.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          {sortedRows.length} ligne{sortedRows.length !== 1 ? 's' : ''}
          {search && ` (filtre)`}
        </span>

        {needsPagination && (
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 border rounded text-xs focus:outline-none"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
