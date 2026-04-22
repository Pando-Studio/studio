'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle, ArrowUpAZ, ArrowUp, ArrowDown } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

interface GlossaryData {
  title: string;
  terms: GlossaryTerm[];
  sortAlphabetically: boolean;
}

export function GlossaryEditor({ data, onSave }: WidgetEditorProps) {
  const [glossaryData, setGlossaryData] = useState<GlossaryData>(() => ({
    title: '',
    terms: [{ id: crypto.randomUUID(), term: '', definition: '' }],
    sortAlphabetically: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as GlossaryData));
  const [error, setError] = useState<string | null>(null);

  const addTerm = () => {
    setGlossaryData((prev) => ({
      ...prev,
      terms: [...prev.terms, { id: crypto.randomUUID(), term: '', definition: '' }],
    }));
  };

  const removeTerm = (id: string) => {
    if (glossaryData.terms.length <= 1) return;
    setGlossaryData((prev) => ({
      ...prev,
      terms: prev.terms.filter((t) => t.id !== id),
    }));
  };

  const updateTerm = (id: string, field: keyof GlossaryTerm, value: string) => {
    setGlossaryData((prev) => ({
      ...prev,
      terms: prev.terms.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    }));
  };

  const moveTerm = (index: number, direction: 'up' | 'down') => {
    setGlossaryData((prev) => {
      const terms = [...prev.terms];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= terms.length) return prev;
      [terms[index], terms[target]] = [terms[target], terms[index]];
      return { ...prev, terms };
    });
  };

  const sortTermsAlphabetically = () => {
    setGlossaryData((prev) => ({
      ...prev,
      terms: [...prev.terms].sort((a, b) => a.term.localeCompare(b.term)),
    }));
  };

  const handleSave = () => {
    const hasEmpty = glossaryData.terms.some((t) => !t.term.trim() || !t.definition.trim());
    if (hasEmpty) {
      setError('Tous les termes et definitions doivent etre remplis.');
      return;
    }
    setError(null);
    onSave(glossaryData as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="glossary-title">Titre</Label>
        <Input
          id="glossary-title"
          placeholder="Titre du glossaire..."
          value={glossaryData.title}
          onChange={(e) => setGlossaryData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Termes</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={sortTermsAlphabetically}
            className="text-xs gap-1.5"
          >
            <ArrowUpAZ className="h-3.5 w-3.5" />
            Trier A-Z
          </Button>
        </div>
        {glossaryData.terms.map((term, index) => (
          <div key={term.id} className="space-y-2 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Terme {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveTerm(index, 'up')}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Monter"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTerm(index, 'down')}
                  disabled={index === glossaryData.terms.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Descendre"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                {glossaryData.terms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTerm(term.id)}
                    className="text-destructive hover:text-destructive/80 ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Input
              placeholder="Terme..."
              value={term.term}
              onChange={(e) => updateTerm(term.id, 'term', e.target.value)}
            />
            <textarea
              className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Definition..."
              value={term.definition}
              onChange={(e) => updateTerm(term.id, 'definition', e.target.value)}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addTerm} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un terme
        </Button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={glossaryData.sortAlphabetically}
          onChange={(e) =>
            setGlossaryData((prev) => ({ ...prev, sortAlphabetically: e.target.checked }))
          }
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm">Trier par ordre alphabetique</span>
      </label>

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
