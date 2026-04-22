'use client';

import { useState } from 'react';
import { ListChecks, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

interface QcmOption {
  id: string;
  label: string;
  isCorrect?: boolean;
}

interface QcmQuestion {
  id: string;
  question: string;
  options: QcmOption[];
  allowMultiple?: boolean;
  explanation?: string;
  points?: number;
}

interface QcmData {
  questions: QcmQuestion[];
  showCorrectAnswer?: boolean;
}

export function QcmDisplay({ data }: WidgetDisplayProps) {
  const qcm = data as unknown as QcmData;
  const questions = qcm.questions || [];
  const [openId, setOpenId] = useState<string | null>(null);

  if (!questions.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune question disponible.
      </div>
    );
  }

  const totalPoints = questions.reduce((s, q) => s + (q.points ?? 1), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">QCM</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {questions.length} question{questions.length > 1 ? 's' : ''} · {totalPoints} pts
        </span>
      </div>

      {questions.map((q, i) => {
        const isOpen = openId === q.id;
        return (
          <Card key={q.id} className="overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setOpenId(isOpen ? null : q.id)}
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium">{q.question || 'Question sans titre'}</span>
              {q.allowMultiple && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Multiple</span>
              )}
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5 border-t pt-2">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                      opt.isCorrect
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-muted/50 text-muted-foreground',
                    )}
                  >
                    {opt.isCorrect ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    {opt.label}
                  </div>
                ))}
                {q.explanation && (
                  <p className="text-xs text-muted-foreground italic mt-2 px-1">
                    {q.explanation}
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
