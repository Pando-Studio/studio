'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { CheckCircle, XCircle, ChevronRight, RotateCcw, Trophy, Clock } from 'lucide-react';
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
}

interface AnswerRecord {
  selected: string;
  correct: boolean;
}

export function QuizPlayer({ data }: WidgetDisplayProps) {
  const quizData = data as unknown as QuizData;
  const questions = quizData.questions || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState<Map<number, AnswerRecord>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Timer
  useEffect(() => {
    if (!currentQuestion?.timeLimit || isAnswered) {
      setTimeRemaining(null);
      return;
    }

    setTimeRemaining(currentQuestion.timeLimit);
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto-validate on timeout
          setIsAnswered(true);
          const isCorrect = false;
          setAnswers((prev) => {
            const next = new Map(prev);
            next.set(currentQuestionIndex, { selected: '', correct: isCorrect });
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, isAnswered, currentQuestion?.timeLimit]);

  // Reset timer when moving to new question
  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [currentQuestionIndex]);

  if (totalQuestions === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucune question dans ce quiz
      </p>
    );
  }

  const handleValidate = () => {
    if (!selectedAnswer || isAnswered) return;

    const correct = currentQuestion.correctAnswer;
    const isCorrect = typeof correct === 'string'
      ? selectedAnswer === correct
      : Array.isArray(correct) && correct.includes(selectedAnswer);

    setIsAnswered(true);
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(currentQuestionIndex, { selected: selectedAnswer, correct: isCorrect });
      return next;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setAnswers(new Map());
    setShowResults(false);
  };

  const correctCount = Array.from(answers.values()).filter((a) => a.correct).length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Results screen
  if (showResults) {
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
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Question summary */}
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
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const isCorrectAnswer = (option: string) => {
    const correct = currentQuestion.correctAnswer;
    return typeof correct === 'string'
      ? option === correct
      : Array.isArray(correct) && correct.includes(option);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentQuestionIndex + 1}/{totalQuestions}</span>
          {timeRemaining !== null && (
            <span className={cn('flex items-center gap-1', timeRemaining <= 5 && 'text-red-500')}>
              <Clock className="h-3 w-3" />
              {timeRemaining}s
            </span>
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
      </div>

      {/* Options */}
      {currentQuestion.options && (
        <div className="space-y-2">
          {currentQuestion.options.map((option, i) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = isCorrectAnswer(option);

            let optionClass = 'border bg-background hover:bg-muted/50 cursor-pointer';
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
                key={i}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg text-sm text-left transition-colors',
                  optionClass,
                  isAnswered && 'cursor-default'
                )}
                onClick={() => !isAnswered && setSelectedAnswer(option)}
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
                      'h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      isSelected ? 'border-primary' : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                )}
                <span className={cn(
                  isAnswered && isCorrect && 'font-medium text-green-700',
                  isAnswered && isSelected && !isCorrect && 'text-red-600',
                )}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback after answer */}
      {isAnswered && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          answers.get(currentQuestionIndex)?.correct
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        )}>
          <p className={cn(
            'font-medium mb-1',
            answers.get(currentQuestionIndex)?.correct ? 'text-green-700' : 'text-red-700'
          )}>
            {answers.get(currentQuestionIndex)?.correct ? 'Bonne reponse !' : 'Mauvaise reponse'}
          </p>
          {currentQuestion.explanation && (
            <p className="text-muted-foreground">{currentQuestion.explanation}</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {!isAnswered ? (
          <Button onClick={handleValidate} disabled={!selectedAnswer}>
            Valider
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentQuestionIndex < totalQuestions - 1 ? (
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
