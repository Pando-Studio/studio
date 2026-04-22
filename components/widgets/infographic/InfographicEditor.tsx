'use client';

import { useCallback } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  BarChart3,
  List,
  FileText,
  Columns2,
  Hash,
} from 'lucide-react';
import { Input, Button, Label } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WidgetEditorProps } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SectionType = 'stat' | 'text' | 'list' | 'comparison';

interface ComparisonColumn {
  header: string;
  items: string[];
}

interface InfographicSection {
  id: string;
  type: SectionType;
  title?: string;
  content?: string;
  value?: string;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  items?: string[];
  listStyle?: 'check' | 'arrow' | 'dot';
  columns?: ComparisonColumn[];
}

interface InfographicData {
  title?: string;
  subtitle?: string;
  sections: InfographicSection[];
  colorScheme?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SECTION_TYPES: { value: SectionType; label: string; icon: typeof BarChart3 }[] = [
  { value: 'stat', label: 'Statistique', icon: Hash },
  { value: 'list', label: 'Liste', icon: List },
  { value: 'text', label: 'Texte', icon: FileText },
  { value: 'comparison', label: 'Comparaison', icon: Columns2 },
];

const TYPE_BADGE_COLORS: Record<SectionType, string> = {
  stat: 'bg-blue-100 text-blue-700',
  list: 'bg-emerald-100 text-emerald-700',
  text: 'bg-slate-100 text-slate-700',
  comparison: 'bg-violet-100 text-violet-700',
};

const COLOR_SCHEME_OPTIONS = [
  { value: 'blue', label: 'Bleu', swatch: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', swatch: 'bg-violet-500' },
  { value: 'emerald', label: 'Vert', swatch: 'bg-emerald-500' },
  { value: 'amber', label: 'Ambre', swatch: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', swatch: 'bg-rose-500' },
  { value: 'slate', label: 'Gris', swatch: 'bg-slate-500' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultSection(type: SectionType): InfographicSection {
  const base = { id: generateId(), type, title: '' };
  switch (type) {
    case 'stat':
      return { ...base, value: '0', label: 'Label' };
    case 'list':
      return { ...base, items: ['Element 1'], listStyle: 'check' as const };
    case 'comparison':
      return { ...base, columns: [{ header: 'Option A', items: ['Item 1'] }, { header: 'Option B', items: ['Item 1'] }] };
    case 'text':
    default:
      return { ...base, content: '' };
  }
}

/* ------------------------------------------------------------------ */
/*  Section editors                                                    */
/* ------------------------------------------------------------------ */

function StatSectionEditor({
  section,
  onChange,
}: {
  section: InfographicSection;
  onChange: (updated: InfographicSection) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Valeur</Label>
        <Input
          className="h-8 text-sm"
          value={section.value ?? ''}
          onChange={(e) => onChange({ ...section, value: e.target.value })}
          placeholder="42%"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input
          className="h-8 text-sm"
          value={section.label ?? section.title ?? ''}
          onChange={(e) => onChange({ ...section, label: e.target.value, title: e.target.value })}
          placeholder="Taux de reussite"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Tendance</Label>
        <div className="flex gap-1">
          {(['up', 'down', 'neutral'] as const).map((t) => (
            <Button
              key={t}
              variant={section.trend === t ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange({ ...section, trend: section.trend === t ? undefined : t })}
            >
              {t === 'up' ? 'Hausse' : t === 'down' ? 'Baisse' : 'Stable'}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListSectionEditor({
  section,
  onChange,
}: {
  section: InfographicSection;
  onChange: (updated: InfographicSection) => void;
}) {
  const items = section.items ?? [];

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">Style de puces</Label>
        <div className="flex gap-1">
          {(['check', 'arrow', 'dot'] as const).map((s) => (
            <Button
              key={s}
              variant={section.listStyle === s ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange({ ...section, listStyle: s })}
            >
              {s === 'check' ? 'Check' : s === 'arrow' ? 'Fleche' : 'Puce'}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Elements</Label>
        {items.map((item, i) => (
          <div key={i} className="flex gap-1">
            <Input
              className="h-7 text-xs flex-1"
              value={item}
              onChange={(e) => {
                const newItems = [...items];
                newItems[i] = e.target.value;
                onChange({ ...section, items: newItems });
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => {
                const newItems = items.filter((_, idx) => idx !== i);
                onChange({ ...section, items: newItems });
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onChange({ ...section, items: [...items, ''] })}
        >
          <Plus className="h-3 w-3" /> Ajouter
        </Button>
      </div>
    </div>
  );
}

function ComparisonSectionEditor({
  section,
  onChange,
}: {
  section: InfographicSection;
  onChange: (updated: InfographicSection) => void;
}) {
  const columns = section.columns ?? [];

  return (
    <div className="space-y-2">
      <Label className="text-xs">Colonnes</Label>
      <div className="grid grid-cols-2 gap-2">
        {columns.map((col, ci) => (
          <div key={ci} className="space-y-1 border rounded-md p-2">
            <Input
              className="h-7 text-xs font-semibold"
              value={col.header}
              onChange={(e) => {
                const newCols = [...columns];
                newCols[ci] = { ...col, header: e.target.value };
                onChange({ ...section, columns: newCols });
              }}
              placeholder="Titre colonne"
            />
            {col.items.map((item, ii) => (
              <div key={ii} className="flex gap-1">
                <Input
                  className="h-6 text-[11px] flex-1"
                  value={item}
                  onChange={(e) => {
                    const newCols = [...columns];
                    const newItems = [...col.items];
                    newItems[ii] = e.target.value;
                    newCols[ci] = { ...col, items: newItems };
                    onChange({ ...section, columns: newCols });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => {
                    const newCols = [...columns];
                    newCols[ci] = { ...col, items: col.items.filter((_, idx) => idx !== ii) };
                    onChange({ ...section, columns: newCols });
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] gap-1 w-full"
              onClick={() => {
                const newCols = [...columns];
                newCols[ci] = { ...col, items: [...col.items, ''] };
                onChange({ ...section, columns: newCols });
              }}
            >
              <Plus className="h-2.5 w-2.5" /> Item
            </Button>
          </div>
        ))}
      </div>
      {columns.length < 4 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onChange({ ...section, columns: [...columns, { header: 'Colonne', items: ['Item 1'] }] })}
        >
          <Plus className="h-3 w-3" /> Colonne
        </Button>
      )}
    </div>
  );
}

function TextSectionEditor({
  section,
  onChange,
}: {
  section: InfographicSection;
  onChange: (updated: InfographicSection) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Contenu</Label>
      <textarea
        className="w-full h-20 text-sm border rounded-lg p-2 bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        value={section.content ?? ''}
        onChange={(e) => onChange({ ...section, content: e.target.value })}
        placeholder="Texte de la section..."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section item (in the overview list)                                */
/* ------------------------------------------------------------------ */

function SectionItem({
  section,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  section: InfographicSection;
  index: number;
  total: number;
  onUpdate: (updated: InfographicSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const TypeIcon = SECTION_TYPES.find((t) => t.value === section.type)?.icon ?? FileText;

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-background">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', TYPE_BADGE_COLORS[section.type])}>
          <TypeIcon className="h-3 w-3 inline mr-0.5" />
          {SECTION_TYPES.find((t) => t.value === section.type)?.label}
        </span>
        <Input
          className="h-7 text-xs flex-1"
          value={section.title ?? ''}
          onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          placeholder="Titre de la section"
        />
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={index === 0}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={index === total - 1}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Type-specific editor */}
      {section.type === 'stat' && <StatSectionEditor section={section} onChange={onUpdate} />}
      {section.type === 'list' && <ListSectionEditor section={section} onChange={onUpdate} />}
      {section.type === 'comparison' && <ComparisonSectionEditor section={section} onChange={onUpdate} />}
      {section.type === 'text' && <TextSectionEditor section={section} onChange={onUpdate} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Editor                                                        */
/* ------------------------------------------------------------------ */

export function InfographicEditor({ data, onSave }: WidgetEditorProps) {
  const infographic = data as unknown as InfographicData;
  const sections: InfographicSection[] = infographic.sections ?? [];

  const save = useCallback(
    (patch: Partial<InfographicData>) => {
      onSave({ ...data, ...patch });
    },
    [data, onSave],
  );

  const updateSection = useCallback(
    (index: number, updated: InfographicSection) => {
      const newSections = [...sections];
      newSections[index] = updated;
      save({ sections: newSections });
    },
    [sections, save],
  );

  const deleteSection = useCallback(
    (index: number) => {
      save({ sections: sections.filter((_, i) => i !== index) });
    },
    [sections, save],
  );

  const moveSection = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= sections.length) return;
      const newSections = [...sections];
      const [moved] = newSections.splice(from, 1);
      newSections.splice(to, 0, moved);
      save({ sections: newSections });
    },
    [sections, save],
  );

  const addSection = useCallback(
    (type: SectionType) => {
      save({ sections: [...sections, createDefaultSection(type)] });
    },
    [sections, save],
  );

  return (
    <div className="space-y-4">
      {/* Title + subtitle */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Titre</Label>
          <Input
            className="h-8 text-sm"
            value={infographic.title ?? ''}
            onChange={(e) => save({ title: e.target.value })}
            placeholder="Titre de l'infographie"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sous-titre</Label>
          <Input
            className="h-8 text-sm"
            value={infographic.subtitle ?? ''}
            onChange={(e) => save({ subtitle: e.target.value })}
            placeholder="Sous-titre (optionnel)"
          />
        </div>
      </div>

      {/* Color scheme selector */}
      <div className="space-y-1">
        <Label className="text-xs">Theme de couleurs</Label>
        <div className="flex gap-2">
          {COLOR_SCHEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-all',
                opt.swatch,
                infographic.colorScheme === opt.value
                  ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background ring-primary'
                  : 'border-transparent hover:scale-105',
              )}
              title={opt.label}
              onClick={() => save({ colorScheme: opt.value })}
            />
          ))}
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            Sections ({sections.length})
          </Label>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {sections.map((section, i) => (
            <SectionItem
              key={section.id}
              section={section}
              index={i}
              total={sections.length}
              onUpdate={(updated) => updateSection(i, updated)}
              onDelete={() => deleteSection(i)}
              onMoveUp={() => moveSection(i, i - 1)}
              onMoveDown={() => moveSection(i, i + 1)}
            />
          ))}
        </div>

        {sections.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            Aucune section. Ajoutez-en une ci-dessous.
          </div>
        )}
      </div>

      {/* Add section buttons */}
      <div className="flex flex-wrap gap-1.5">
        {SECTION_TYPES.map((st) => {
          const Icon = st.icon;
          return (
            <Button
              key={st.value}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => addSection(st.value)}
            >
              <Icon className="h-3 w-3" />
              {st.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
