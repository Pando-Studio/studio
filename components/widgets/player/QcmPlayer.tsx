'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import {
  ListChecks,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { usePlayer } from './PlayerContext';
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

interface QuestionAnswer {
  selectedIds: Set<string>;
  correct: boolean;
  points: number;
}

export function QcmPlayer({ data }: WidgetDisplayProps) {
  const qcm = data as unknown as QcmData;
  const questions = qcm.questions ?? [];
  const { trackStart, trackComplete, trackProgress } = usePlayer();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState<Map<number, QuestionAnswer>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  const ensureStarted = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      trackStart();
    }
  }, [hasStarted, trackStart]);

  if (!totalQuestions) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucune question dans ce QCM
      </p>
    );
  }

  const toggleOption = (optionId: string) => {
    ensureStarted();
    if (isAnswered) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (currentQuestion?.allowMultiple) {
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
      } else {
        next.clear();
        next.add(optionId);
      }
      return next;
    });
  };

  const handleValidate = () => {
    if (!currentQuestion || selectedIds.size === 0 || isAnswered) return;

    const correctIds = new Set(
      currentQuestion.options.filter((o) => o.isCorrect).map((o) => o.id)
    );
    const isCorrect =
      selectedIds.size === correctIds.size &&
      [...selectedIds].every((id) => correctIds.has(id));

    const points = isCorrect ? (currentQuestion.points ?? 1) : 0;

    setIsAnswered(true);
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(currentIndex, { selectedIds: new Set(selectedIds), correct: isCorrect, points });
      return next;
    });

    trackProgress((currentIndex + 1) / totalQuestions);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedIds(new Set());
      setIsAnswered(false);
    } else {
      setShowResults(true);
      const totalPoints = questions.reduce((s, q) => s + (q.points ?? 1), 0);
      const earnedPoints = Array.from(answers.values()).reduce(
        (s, a) => s + a.points,
        0
      );
      trackComplete(earnedPoints, totalPoints);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedIds(new Set());
    setIsAnswered(false);
    setAnswers(new Map());
    setShowResults(false);
    setHasStarted(false);
  };

  // Results screen
  if (showResults) {
    const totalPoints = questions.reduce((s, q) => s + (q.points ?? 1), 0);
    const earnedPoints = Array.from(answers.values()).reduce(
      (s, a) => s + a.points,
      0
    );
    const correctCount = Array.from(answers.values()).filter((a) => a.correct).length;
    const percentage =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        <div className="p-4 bg-primary/10 rounded-full">
          <Trophy className="h-10 w-10 text-primary" />
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold mb-1">Resultats</h3>
          <p className="text-lg text-muted-foreground">
            {correctCount}/{totalQuestions} bonnes reponses ({percentage}%)
          </p>
          <p className="text-sm text-muted-foreground">
            {earnedPoints}/{totalPoints} points
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percentage >= 80
                  ? 'bg-green-500'
                  : percentage >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {questions.map((_, i) => {
            const answer = answers.get(i);
            return (
              <div
                key={i}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                  !answer
                    ? 'bg-muted text-muted-foreground'
                    : answer.correct
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                )}
              >
                Q{i + 1}
              </div>
            );
          })}
        </div>

        <Button onClick={handleRestart} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Recommencer
        </Button>
      </div>
    );
  }

  // Question screen
  if (!currentQuestion) return null;

  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">QCM</span>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {currentIndex + 1}/{totalQuestions}
          </span>
          {currentQuestion.points && currentQuestion.points > 1 && (
            <span>{currentQuestion.points} pts</span>
          )}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h3 className="text-base font-semibold">{currentQuestion.question}</h3>
        {currentQuestion.allowMultiple && (
          <p className="text-xs text-muted-foreground mt-1">
            Plusieurs reponses possibles
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {currentQuestion.options.map((opt) => {
          const isSelected = selectedIds.has(opt.id);
          const isCorrect = opt.isCorrect === true;

          let optionClass =
            'border bg-background hover:bg-muted/50 cursor-pointer';
          if (isAnswered) {
            if (isCorrect) {
              optionClass = 'border-green-300 bg-green-50';
            } else if (isSelected && !isCorrect) {
              optionClass = 'border-red-300 bg-red-50';
            } else {
              optionClass = 'border bg-background opacity-60';
            }
          } else if (isSelected) {
            optionClass = 'border-primary bg-primary/5 ring-1 ring-primary';
          }

          return (
            <button
              key={opt.id}
              type="button"
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg text-sm text-left transition-colors',
                optionClass,
                isAnswered && 'cursor-default'
              )}
              onClick={() => toggleOption(opt.id)}
              disabled={isAnswered}
            >
              {isAnswered ? (
                isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : isSelected ? (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                )
              ) : (
                <div
                  className={cn(
                    'h-5 w-5 flex-shrink-0 flex items-center justify-center border-2',
                    currentQuestion.allowMultiple
                      ? 'rounded-sm'
                      : 'rounded-full',
                    isSelected
                      ? 'border-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && (
                    <div
                      className={cn(
                        'bg-primary',
                        currentQuestion.allowMultiple
                          ? 'h-2.5 w-2.5 rounded-[1px]'
                          : 'h-2.5 w-2.5 rounded-full'
                      )}
                    />
                  )}
                </div>
              )}
              <span
                className={cn(
                  isAnswered && isCorrect && 'font-medium text-green-700',
                  isAnswered && isSelected && !isCorrect && 'text-red-600'
                )}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {isAnswered && (
        <div
          className={cn(
            'p-3 rounded-lg text-sm',
            answers.get(currentIndex)?.correct
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          )}
        >
          <p
            className={cn(
              'font-medium mb-1',
              answers.get(currentIndex)?.correct
                ? 'text-green-700'
                : 'text-red-700'
            )}
          >
            {answers.get(currentIndex)?.correct
              ? 'Bonne reponse !'
              : 'Mauvaise reponse'}
          </p>
          {currentQuestion.explanation && (
            <p className="text-muted-foreground">
              {currentQuestion.explanation}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {!isAnswered ? (
          <Button onClick={handleValidate} disabled={selectedIds.size === 0}>
            Valider
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentIndex < totalQuestions - 1 ? (
              <>
                Question suivante
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              'Voir les resultats'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
