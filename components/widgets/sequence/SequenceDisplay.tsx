'use client';

import { ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps, WidgetData } from '../types';
import { getWidgetRenderers } from '../registry';

const widgetTypeLabels: Record<string, string> = {
  QUIZ: 'Quiz',
  WORDCLOUD: 'Nuage de mots',
  ROLEPLAY: 'Roleplay',
  MULTIPLE_CHOICE: 'Choix Multiple',
  POSTIT: 'Post-it',
  RANKING: 'Classement',
  OPENTEXT: 'Texte libre',
  SEQUENCE: 'Sequence',
  COURSE_MODULE: 'Module de cours',
  PRESENTATION: 'Presentation',
  SLIDE: 'Slide',
  FAQ: 'FAQ',
  GLOSSARY: 'Glossaire',
  SUMMARY: 'Resume',
  FLASHCARD: 'Flashcard',
  TIMELINE: 'Frise chronologique',
  REPORT: 'Rapport',
  DATA_TABLE: 'Tableau de donnees',
};

export function SequenceDisplay({ data, children: childWidgets }: WidgetDisplayProps) {
  if (!childWidgets || childWidgets.length === 0) {
    return (
      <div className="text-center py-8">
        <ListOrdered className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Sequence vide — ajoutez des widgets via l&apos;editeur
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-3">
        <ListOrdered className="h-4 w-4" />
        <span>{childWidgets.length} etapes</span>
      </div>

      <div className="space-y-3">
        {childWidgets.map((child, index) => {
          const renderers = getWidgetRenderers(child.type);
          return (
            <div key={child.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{child.title}</span>
                <span className="text-xs text-muted-foreground">
                  {widgetTypeLabels[child.type] || child.type}
                </span>
              </div>
              <div className="p-4">
                <renderers.Display data={child.data} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
