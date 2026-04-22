'use client';

import ReactMarkdown from 'react-markdown';
import { BookOpen, Clock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

interface SyllabusData {
  title?: string;
  content?: string;
  duration?: string;
  level?: string;
  locale?: string;
}

export function SyllabusDisplay({ data }: WidgetDisplayProps) {
  const d = data as unknown as SyllabusData;

  if (!d.content) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun contenu disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {d.title && (
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{d.title}</h3>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {d.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {d.duration}
          </span>
        )}
        {d.level && (
          <span className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> {d.level}
          </span>
        )}
        {d.locale && d.locale !== 'generic' && (
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{d.locale}</span>
        )}
      </div>

      <div className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5',
        'prose-headings:my-3 prose-blockquote:my-2',
        'prose-table:text-sm prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5',
        'prose-table:border prose-th:border prose-td:border prose-th:bg-muted/50',
      )}>
        <ReactMarkdown>{d.content}</ReactMarkdown>
      </div>
    </div>
  );
}
