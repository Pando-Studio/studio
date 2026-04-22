'use client';

import { BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps, WidgetData } from '../types';
import { getWidgetRenderers } from '../registry';

interface SlotConfig {
  id: string;
  name: string;
  required: boolean;
}

const DEFAULT_SLOTS: SlotConfig[] = [
  { id: 'intro', name: 'Introduction', required: true },
  { id: 'activities', name: 'Activites', required: false },
  { id: 'assessment', name: 'Evaluation', required: true },
];

export function CourseModuleDisplay({ data, children: childWidgets }: WidgetDisplayProps) {
  const items = childWidgets || [];

  const getSlotChildren = (slotId: string) =>
    items.filter((c) => c.slotId === slotId);

  const hasContent = items.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Module vide — ajoutez du contenu via l&apos;editeur
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-3">
        <BookOpen className="h-4 w-4" />
        <span>Module de cours — {items.length} widget{items.length > 1 ? 's' : ''}</span>
      </div>

      {DEFAULT_SLOTS.map((slot) => {
        const slotChildren = getSlotChildren(slot.id);

        return (
          <div key={slot.id} className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b">
              <span className="text-sm font-medium">{slot.name}</span>
              {slot.required && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  requis
                </span>
              )}
              {slot.required && slotChildren.length === 0 && (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {slotChildren.length} widget{slotChildren.length !== 1 ? 's' : ''}
              </span>
            </div>

            {slotChildren.length > 0 ? (
              <div className="divide-y">
                {slotChildren.map((child) => {
                  const renderers = getWidgetRenderers(child.type);
                  return (
                    <div key={child.id} className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">{child.title}</p>
                      <renderers.Display data={child.data} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Aucun contenu
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
