'use client';

import { CheckCircle2, XCircle, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

interface MultipleChoiceOption {
  id: string;
  label: string;
  isCorrect?: boolean;
}

interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: MultipleChoiceOption[];
  allowMultiple?: boolean;
}

interface MultipleChoiceData {
  questions: MultipleChoiceQuestion[];
  showCorrectAnswer?: boolean;
  timeLimit?: number;
  showLiveResults?: boolean;
}

export function MultipleChoiceDisplay({ data }: WidgetDisplayProps) {
  const mcData = data as unknown as MultipleChoiceData;

  const totalQuestions = mcData.questions?.length || 0;
  const multipleCount = mcData.questions?.filter((q) => q.allowMultiple).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
          <ListChecks className="h-3.5 w-3.5" />
          {totalQuestions} questions
        </span>
        {multipleCount > 0 && (
          <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs">
            {multipleCount} a choix multiples
          </span>
        )}
        {mcData.timeLimit && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
            <Clock className="h-3.5 w-3.5" />
            {mcData.timeLimit}s
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {mcData.questions?.map((question, qIndex) => (
          <div key={question.id || qIndex} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-medium flex items-center justify-center">
                {qIndex + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{question.question}</p>
                {question.allowMultiple && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Plusieurs reponses possibles
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 ml-8">
              {question.options?.map((option, oIndex) => (
                <div
                  key={option.id || oIndex}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm border',
                    option.isCorrect
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-100 bg-gray-50'
                  )}
                >
                  {option.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
