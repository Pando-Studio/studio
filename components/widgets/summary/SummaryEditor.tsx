'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface SummarySection {
  heading: string;
  bullets: string[];
}

interface SummaryData {
  title: string;
  sections: SummarySection[];
  sourceDocuments?: string[];
}

export function SummaryEditor({ data, onSave }: WidgetEditorProps) {
  const [summaryData, setSummaryData] = useState<SummaryData>(() => ({
    title: '',
    sections: [{ heading: '', bullets: [''] }],
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as SummaryData));
  const [error, setError] = useState<string | null>(null);

  const addSection = () => {
    setSummaryData((prev) => ({
      ...prev,
      sections: [...prev.sections, { heading: '', bullets: [''] }],
    }));
  };

  const removeSection = (index: number) => {
    if (summaryData.sections.length <= 1) return;
    setSummaryData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSummaryData((prev) => {
      const sections = [...prev.sections];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= sections.length) return prev;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...prev, sections };
    });
  };

  const updateSectionHeading = (index: number, heading: string) => {
    setSummaryData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, heading } : s)),
    }));
  };

  const addBullet = (sectionIndex: number) => {
    setSummaryData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, bullets: [...s.bullets, ''] } : s,
      ),
    }));
  };

  const removeBullet = (sectionIndex: number, bulletIndex: number) => {
    setSummaryData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex && s.bullets.length > 1
          ? { ...s, bullets: s.bullets.filter((_, bi) => bi !== bulletIndex) }
          : s,
      ),
    }));
  };

  const updateBullet = (sectionIndex: number, bulletIndex: number, value: string) => {
    setSummaryData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? { ...s, bullets: s.bullets.map((b, bi) => (bi === bulletIndex ? value : b)) }
          : s,
      ),
    }));
  };

  const handleSave = () => {
    const hasEmpty = summaryData.sections.some(
      (s) => !s.heading.trim() || s.bullets.some((b) => !b.trim()),
    );
    if (hasEmpty) {
      setError('Tous les titres et points doivent etre remplis.');
      return;
    }
    setError(null);
    onSave(summaryData as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="summary-title">Titre</Label>
        <Input
          id="summary-title"
          placeholder="Titre du resume..."
          value={summaryData.title}
          onChange={(e) => setSummaryData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-4">
        <Label>Sections</Label>
        {summaryData.sections.map((section, sIndex) => (
          <div key={sIndex} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Section {sIndex + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(sIndex, 'up')}
                  disabled={sIndex === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Monter"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(sIndex, 'down')}
                  disabled={sIndex === summaryData.sections.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Descendre"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                {summaryData.sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(sIndex)}
                    className="text-destructive hover:text-destructive/80 ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Input
              placeholder="Titre de la section..."
              value={section.heading}
              onChange={(e) => updateSectionHeading(sIndex, e.target.value)}
            />
            <div className="space-y-2 pl-2">
              {section.bullets.map((bullet, bIndex) => (
                <div key={bIndex} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">•</span>
                  <Input
                    className="flex-1"
                    placeholder="Point..."
                    value={bullet}
                    onChange={(e) => updateBullet(sIndex, bIndex, e.target.value)}
                  />
                  {section.bullets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBullet(sIndex, bIndex)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addBullet(sIndex)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un point
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSection} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une section
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
