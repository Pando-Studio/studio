'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Plus, Trash2, AlertCircle, BookOpen } from 'lucide-react';
import type { WidgetEditorProps, WidgetType, WidgetData } from '../types';

interface SlotConfig {
  id: string;
  name: string;
  description: string;
  required: boolean;
  maxChildren?: number;
  allowedTypes: WidgetType[];
}

const SLOT_CONFIGS: SlotConfig[] = [
  {
    id: 'intro',
    name: 'Introduction',
    description: 'Contenu d\'introduction du module',
    required: true,
    maxChildren: 1,
    allowedTypes: ['PRESENTATION', 'OPENTEXT'],
  },
  {
    id: 'activities',
    name: 'Activites',
    description: 'Activites interactives du module',
    required: false,
    allowedTypes: ['QUIZ', 'MULTIPLE_CHOICE', 'WORDCLOUD', 'POSTIT', 'RANKING', 'OPENTEXT', 'ROLEPLAY', 'SEQUENCE'],
  },
  {
    id: 'assessment',
    name: 'Evaluation',
    description: 'Evaluation finale du module',
    required: true,
    maxChildren: 1,
    allowedTypes: ['QUIZ', 'MULTIPLE_CHOICE'],
  },
];

const typeLabels: Record<string, string> = {
  QUIZ: 'Quiz',
  MULTIPLE_CHOICE: 'Choix Multiple',
  WORDCLOUD: 'Nuage de mots',
  POSTIT: 'Post-it',
  RANKING: 'Classement',
  OPENTEXT: 'Texte libre',
  ROLEPLAY: 'Roleplay',
  PRESENTATION: 'Presentation',
  SEQUENCE: 'Sequence',
};

export function CourseModuleEditor({
  data,
  onSave,
  children: childWidgets,
  onAddChild,
  onRemoveChild,
}: WidgetEditorProps) {
  const [activeSlotPicker, setActiveSlotPicker] = useState<string | null>(null);
  const items = childWidgets || [];

  const getSlotChildren = (slotId: string) =>
    items.filter((c) => c.slotId === slotId);

  const handleAdd = async (slotId: string, type: WidgetType) => {
    if (onAddChild) {
      await onAddChild(slotId, type);
    }
    setActiveSlotPicker(null);
  };

  const handleRemove = async (childId: string) => {
    if (onRemoveChild) {
      await onRemoveChild(childId);
    }
  };

  return (
    <div className="space-y-6">
      {SLOT_CONFIGS.map((slot) => {
        const slotChildren = getSlotChildren(slot.id);
        const isFull = slot.maxChildren !== undefined && slotChildren.length >= slot.maxChildren;
        const isEmpty = slotChildren.length === 0;

        return (
          <div key={slot.id} className="border rounded-lg overflow-hidden">
            {/* Slot header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{slot.name}</p>
                <p className="text-xs text-muted-foreground">{slot.description}</p>
              </div>
              {slot.required && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  requis
                </span>
              )}
              {slot.required && isEmpty && (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>

            {/* Slot children */}
            <div className="p-3 space-y-2">
              {slotChildren.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-3 p-2 rounded-md border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{child.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[child.type] || child.type}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemove(child.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add button or type picker */}
              {!isFull && (
                activeSlotPicker === slot.id ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      {slot.allowedTypes.map((type) => (
                        <button
                          key={type}
                          className="text-left px-3 py-2 rounded-md border text-sm hover:bg-primary/5 hover:border-primary/50 transition-colors"
                          onClick={() => handleAdd(slot.id, type)}
                        >
                          {typeLabels[type] || type}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSlotPicker(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveSlotPicker(slot.id)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter dans {slot.name}
                  </Button>
                )
              )}
            </div>
          </div>
        );
      })}

      {/* Save */}
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={() => onSave(data)}>Sauvegarder</Button>
      </div>
    </div>
  );
}
