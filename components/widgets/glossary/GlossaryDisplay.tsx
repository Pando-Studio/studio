'use client';

import { useState, useMemo, useCallback } from 'react';
import { BookOpen, Search, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import type { WidgetDisplayProps } from '../types';

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

interface GlossaryData {
  title?: string;
  terms: GlossaryTerm[];
  sortAlphabetically?: boolean;
}

/** Highlight matching text within a string */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function GlossaryDisplay({ data }: WidgetDisplayProps) {
  const glossaryData = data as unknown as GlossaryData;
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const sortedTerms = useMemo(() => {
    const terms = glossaryData.terms ?? [];
    if (glossaryData.sortAlphabetically !== false) {
      return [...terms].sort((a, b) => a.term.localeCompare(b.term));
    }
    return terms;
  }, [glossaryData.terms, glossaryData.sortAlphabetically]);

  // Available letters from the terms
  const availableLetters = useMemo(() => {
    const letters = new Set(
      sortedTerms.map((t) => t.term.charAt(0).toUpperCase()),
    );
    return Array.from(letters).sort();
  }, [sortedTerms]);

  const filteredTerms = useMemo(() => {
    let terms = sortedTerms;
    if (activeLetter) {
      terms = terms.filter(
        (t) => t.term.charAt(0).toUpperCase() === activeLetter,
      );
    }
    if (!search.trim()) return terms;
    const query = search.toLowerCase();
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(query) ||
        t.definition.toLowerCase().includes(query),
    );
  }, [sortedTerms, search, activeLetter]);

  const handleLetterClick = useCallback((letter: string) => {
    setActiveLetter((prev) => (prev === letter ? null : letter));
  }, []);

  if (!glossaryData.terms?.length) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground py-12 gap-3">
        <BookMarked className="h-10 w-10 opacity-40" />
        <p className="text-sm">Aucun terme. Generez un glossaire depuis vos sources.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {glossaryData.title && (
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{glossaryData.title}</h3>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher un terme..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Letter navigation */}
      {availableLetters.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {availableLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => handleLetterClick(letter)}
              className={cn(
                'h-7 w-7 rounded text-xs font-medium transition-colors',
                activeLetter === letter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {letter}
            </button>
          ))}
          {activeLetter && (
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              className="h-7 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              Tout
            </button>
          )}
        </div>
      )}

      <dl className="space-y-3">
        {filteredTerms.map((term) => (
          <div key={term.id} className="p-3 border rounded-lg">
            <dt className="font-semibold text-sm text-primary">
              <HighlightText text={term.term} query={search} />
            </dt>
            <dd className="text-sm text-muted-foreground mt-1">
              <HighlightText text={term.definition} query={search} />
            </dd>
          </div>
        ))}
        {filteredTerms.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun resultat pour &quot;{search}&quot;.
          </p>
        )}
      </dl>
    </div>
  );
}
