'use client';

import { useState, useCallback, useRef } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle, Upload } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataTableColumn {
  id: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

interface DataTableData {
  title: string;
  instructions?: string;
  columns: DataTableColumn[];
  rows: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted values, commas inside quotes)
// ---------------------------------------------------------------------------

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === ';' || ch === '\t') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some((cell) => cell !== '')) rows.push(row);
        row = [];
        if (ch === '\r') i++; // skip \r in \r\n
      } else {
        current += ch;
      }
    }
  }
  // Last cell
  row.push(current.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);

  return rows;
}

function guessColumnType(values: string[]): DataTableColumn['type'] {
  const nonEmpty = values.filter((v) => v !== '');
  if (nonEmpty.length === 0) return 'string';

  // Boolean
  const boolValues = new Set(['true', 'false', 'oui', 'non', 'yes', 'no', '0', '1']);
  if (nonEmpty.every((v) => boolValues.has(v.toLowerCase()))) return 'boolean';

  // Number
  if (nonEmpty.every((v) => !isNaN(Number(v.replace(',', '.'))))) return 'number';

  // Date (ISO or dd/mm/yyyy)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
  if (nonEmpty.every((v) => dateRegex.test(v))) return 'date';

  return 'string';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTableEditor({ data, onSave }: WidgetEditorProps) {
  const [tableData, setTableData] = useState<DataTableData>(() => ({
    title: '',
    columns: [{ id: crypto.randomUUID(), label: '', type: 'string' as const }],
    rows: [],
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as DataTableData));
  const [error, setError] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Column operations ----

  const addColumn = useCallback(() => {
    const newCol: DataTableColumn = {
      id: crypto.randomUUID(),
      label: '',
      type: 'string',
    };
    setTableData((prev) => ({
      ...prev,
      columns: [...prev.columns, newCol],
      rows: prev.rows.map((row) => ({ ...row, [newCol.id]: '' })),
    }));
  }, []);

  const removeColumn = useCallback(
    (colId: string) => {
      if (tableData.columns.length <= 1) return;
      setTableData((prev) => ({
        ...prev,
        columns: prev.columns.filter((c) => c.id !== colId),
        rows: prev.rows.map((row) => {
          const { [colId]: _, ...rest } = row;
          return rest;
        }),
      }));
    },
    [tableData.columns.length],
  );

  const updateColumnLabel = useCallback((colId: string, label: string) => {
    setTableData((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === colId ? { ...c, label } : c)),
    }));
  }, []);

  const updateColumnType = useCallback((colId: string, type: DataTableColumn['type']) => {
    setTableData((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === colId ? { ...c, type } : c)),
    }));
  }, []);

  // ---- Row operations ----

  const addRow = useCallback(() => {
    setTableData((prev) => {
      const newRow: Record<string, string> = {};
      prev.columns.forEach((col) => {
        newRow[col.id] = '';
      });
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  }, []);

  const removeRow = useCallback((rowIndex: number) => {
    setTableData((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== rowIndex),
    }));
  }, []);

  const updateCell = useCallback((rowIndex: number, colId: string, value: string) => {
    setTableData((prev) => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex ? { ...row, [colId]: value } : row,
      ),
    }));
  }, []);

  // ---- CSV import ----

  const importCsv = useCallback(
    (raw: string) => {
      const parsed = parseCsv(raw);
      if (parsed.length < 2) {
        setError('Le CSV doit contenir au moins un en-tete et une ligne de donnees.');
        return;
      }

      const headers = parsed[0];
      const dataRows = parsed.slice(1);

      const columns: DataTableColumn[] = headers.map((header, idx) => {
        const colValues = dataRows.map((r) => r[idx] ?? '');
        return {
          id: crypto.randomUUID(),
          label: header || `Colonne ${idx + 1}`,
          type: guessColumnType(colValues),
        };
      });

      const rows: Record<string, string>[] = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        columns.forEach((col, idx) => {
          obj[col.id] = row[idx] ?? '';
        });
        return obj;
      });

      setTableData((prev) => ({ ...prev, columns, rows }));
      setCsvImportOpen(false);
      setCsvText('');
      setError(null);
    },
    [],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          importCsv(text);
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be re-imported
      e.target.value = '';
    },
    [importCsv],
  );

  // ---- Save ----

  const handleSave = useCallback(() => {
    const hasEmptyColumn = tableData.columns.some((c) => !c.label.trim());
    if (hasEmptyColumn) {
      setError('Tous les noms de colonnes doivent etre remplis.');
      return;
    }
    setError(null);
    onSave(tableData as unknown as Record<string, unknown>);
  }, [tableData, onSave]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="table-title">Titre</Label>
        <Input
          id="table-title"
          placeholder="Titre du tableau..."
          value={tableData.title}
          onChange={(e) => setTableData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="table-instructions">Instructions (optionnel)</Label>
        <textarea
          id="table-instructions"
          className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Decrire les donnees a extraire..."
          value={tableData.instructions ?? ''}
          onChange={(e) =>
            setTableData((prev) => ({ ...prev, instructions: e.target.value }))
          }
        />
      </div>

      {/* CSV Import */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvImportOpen((prev) => !prev)}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-3 w-3" />
            Importer CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs"
          >
            Fichier CSV
          </Button>
        </div>
        {csvImportOpen && (
          <div className="space-y-2 border rounded-md p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Collez votre CSV ci-dessous (separateur: virgule, point-virgule ou tabulation). La premiere ligne sera utilisee comme en-tete.
            </p>
            <textarea
              className="w-full min-h-[100px] px-3 py-2 border rounded-md text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={"Nom,Age,Ville\nAlice,30,Paris\nBob,25,Lyon"}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => importCsv(csvText)} disabled={!csvText.trim()}>
                Importer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvImportOpen(false);
                  setCsvText('');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Column editor */}
      <div className="space-y-3">
        <Label>Colonnes</Label>
        {tableData.columns.map((col, index) => (
          <div key={col.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
            <Input
              className="flex-1"
              placeholder="Nom de la colonne..."
              value={col.label}
              onChange={(e) => updateColumnLabel(col.id, e.target.value)}
            />
            <select
              className="px-2 py-2 border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              value={col.type}
              onChange={(e) =>
                updateColumnType(col.id, e.target.value as DataTableColumn['type'])
              }
            >
              <option value="string">Texte</option>
              <option value="number">Nombre</option>
              <option value="date">Date</option>
              <option value="boolean">Oui/Non</option>
            </select>
            {tableData.columns.length > 1 && (
              <button
                type="button"
                onClick={() => removeColumn(col.id)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4 mr-1" />
          Colonne
        </Button>
      </div>

      {/* Row editor — inline editable table */}
      <div className="space-y-3">
        <Label>Lignes ({tableData.rows.length})</Label>
        {tableData.rows.length > 0 && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1.5 w-8 text-xs text-muted-foreground">#</th>
                  {tableData.columns.map((col) => (
                    <th
                      key={col.id}
                      className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground"
                    >
                      {col.label || '(sans nom)'}
                      <span className="ml-1 text-[10px] text-muted-foreground/50">
                        {col.type === 'number'
                          ? '123'
                          : col.type === 'date'
                            ? 'date'
                            : col.type === 'boolean'
                              ? 'O/N'
                              : 'abc'}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rIndex) => (
                  <tr key={rIndex} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-2 py-1 text-xs text-muted-foreground text-center">
                      {rIndex + 1}
                    </td>
                    {tableData.columns.map((col) => (
                      <td key={col.id} className="px-1 py-1">
                        {col.type === 'boolean' ? (
                          <label className="flex items-center justify-center cursor-pointer h-7">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={['true', 'oui', 'yes', '1'].includes(
                                (row[col.id] ?? '').toLowerCase(),
                              )}
                              onChange={(e) =>
                                updateCell(rIndex, col.id, e.target.checked ? 'true' : 'false')
                              }
                            />
                          </label>
                        ) : (
                          <Input
                            className="text-xs h-7"
                            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                            value={row[col.id] ?? ''}
                            onChange={(e) => updateCell(rIndex, col.id, e.target.value)}
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        onClick={() => removeRow(rIndex)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Ligne
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
