'use client';

import ReactMarkdown from 'react-markdown';
import { School } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

interface ClassOverviewData {
  title?: string;
  content?: string;
  subject?: string;
  grade?: string;
}

export function ClassOverviewDisplay({ data }: WidgetDisplayProps) {
  const d = data as unknown as ClassOverviewData;

  if (!d.content) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun contenu disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <School className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{d.title || 'Classe'}</h3>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {d.subject && (
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">{d.subject}</span>
        )}
        {d.grade && (
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">{d.grade}</span>
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
