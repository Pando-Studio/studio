'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetEditorProps, WidgetType, WidgetData } from '../types';

const addableTypes: Array<{ type: WidgetType; label: string }> = [
  { type: 'QUIZ', label: 'Quiz' },
  { type: 'MULTIPLE_CHOICE', label: 'Choix Multiple' },
  { type: 'WORDCLOUD', label: 'Nuage de mots' },
  { type: 'POSTIT', label: 'Post-it' },
  { type: 'RANKING', label: 'Classement' },
  { type: 'OPENTEXT', label: 'Texte libre' },
  { type: 'ROLEPLAY', label: 'Roleplay' },
];

export function SequenceEditor({
  data,
  onSave,
  children: childWidgets,
  onAddChild,
  onRemoveChild,
  onReorderChildren,
}: WidgetEditorProps) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const items = childWidgets || [];

  const handleAdd = async (type: WidgetType) => {
    if (onAddChild) {
      await onAddChild('default', type);
    }
    setShowTypePicker(false);
  };

  const handleRemove = async (childId: string) => {
    if (onRemoveChild) {
      await onRemoveChild(childId);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0 || !onReorderChildren) return;
    const ids = items.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await onReorderChildren('default', ids);
  };

  const handleMoveDown = async (index: number) => {
    if (index >= items.length - 1 || !onReorderChildren) return;
    const ids = items.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await onReorderChildren('default', ids);
  };

  return (
    <div className="space-y-4">
      {/* Children list */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun widget dans cette sequence
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((child, index) => (
            <div
              key={child.id}
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{child.title}</p>
                <p className="text-xs text-muted-foreground">{child.type}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleRemove(child.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add widget */}
      {showTypePicker ? (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">Ajouter un widget</p>
          <div className="grid grid-cols-2 gap-2">
            {addableTypes.map(({ type, label }) => (
              <button
                key={type}
                className="text-left px-3 py-2 rounded-md border text-sm hover:bg-primary/5 hover:border-primary/50 transition-colors"
                onClick={() => handleAdd(type)}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTypePicker(false)}
          >
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowTypePicker(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un widget
        </Button>
      )}

      {/* Save (sequence metadata) */}
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={() => onSave(data)}>Sauvegarder</Button>
      </div>
    </div>
  );
}
