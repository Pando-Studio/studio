'use client';

import { CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Star, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  timeLimit?: number;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface QuizData {
  questions: QuizQuestion[];
  showImmediateFeedback?: boolean;
  showCorrectAnswer?: boolean;
  showStatistics?: boolean;
  showLeaderboard?: boolean;
  showLiveResults?: boolean;
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: 'Facile', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Moyen', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Difficile', color: 'bg-red-100 text-red-700' },
};

export function QuizDisplay({ data }: WidgetDisplayProps) {
  const quizData = data as unknown as QuizData;
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  if (!quizData.questions || quizData.questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucune question dans ce quiz
      </p>
    );
  }

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const totalPoints = quizData.questions.reduce((sum, q) => sum + (q.points || 1), 0);

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-3">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-4 w-4" />
          {quizData.questions.length} questions
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-4 w-4" />
          {totalPoints} points
        </span>
        {quizData.showLeaderboard && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
            Classement
          </span>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {quizData.questions.map((question, index) => {
          const isExpanded = expandedQuestions.has(index);
          const diff = question.difficulty ? difficultyLabels[question.difficulty] : null;

          return (
            <div key={question.id || index} className="border rounded-lg overflow-hidden">
              {/* Question header */}
              <button
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => toggleQuestion(index)}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{question.question}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {diff && (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', diff.color)}>
                        {diff.label}
                      </span>
                    )}
                    {question.points && (
                      <span className="text-xs text-muted-foreground">
                        {question.points} pt{question.points > 1 ? 's' : ''}
                      </span>
                    )}
                    {question.timeLimit && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {question.timeLimit}s
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
                  {/* Options */}
                  {question.options && (
                    <div className="space-y-2 pt-3">
                      {question.options.map((option, optIdx) => {
                        const isCorrect =
                          typeof question.correctAnswer === 'string'
                            ? option === question.correctAnswer
                            : Array.isArray(question.correctAnswer) &&
                              question.correctAnswer.includes(option);

                        return (
                          <div
                            key={optIdx}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-md text-sm',
                              isCorrect
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-background border'
                            )}
                          >
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className={isCorrect ? 'font-medium text-green-700' : ''}>
                              {option}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm">
                      <p className="font-medium text-blue-700 mb-1">Explication</p>
                      <p className="text-blue-600">{question.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
