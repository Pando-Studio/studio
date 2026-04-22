'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import {
  ArrowUpDown,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trophy,
  RotateCcw,
  Check,
} from 'lucide-react';
import { usePlayer } from './PlayerContext';
import type { WidgetDisplayProps } from '../types';

interface RankingItem {
  id: string;
  label: string;
  description?: string;
}

interface RankingData {
  prompt: string;
  items: RankingItem[];
  timeLimit?: number;
  showLiveResults?: boolean;
}

export function RankingPlayer({ data }: WidgetDisplayProps) {
  const rkData = data as unknown as RankingData;
  const { trackStart, trackComplete } = usePlayer();

  const correctOrder = rkData.items ?? [];
  // Shuffle initial order
  const [userOrder, setUserOrder] = useState<RankingItem[]>(() =>
    [...correctOrder].sort(() => Math.random() - 0.5)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const ensureStarted = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      trackStart();
    }
  }, [hasStarted, trackStart]);

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    ensureStarted();
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= userOrder.length) return;

    const newOrder = [...userOrder];
    const item = newOrder[fromIndex];
    if (!item) return;
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, item);
    setUserOrder(newOrder);
  };

  const handleSubmit = () => {
    ensureStarted();
    // Score: count items at correct position
    let correct = 0;
    for (let i = 0; i < userOrder.length; i++) {
      if (userOrder[i]?.id === correctOrder[i]?.id) {
        correct++;
      }
    }
    const total = correctOrder.length;
    setScore(correct);
    setIsSubmitted(true);
    trackComplete(correct, total);
  };

  const handleReset = () => {
    setUserOrder([...correctOrder].sort(() => Math.random() - 0.5));
    setIsSubmitted(false);
    setScore(null);
    setHasStarted(false);
  };

  if (!correctOrder.length) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucun element a classer.
      </p>
    );
  }

  if (isSubmitted && score !== null) {
    const percentage = Math.round((score / correctOrder.length) * 100);

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-1">Resultats</h3>
            <p className="text-lg text-muted-foreground">
              {score}/{correctOrder.length} bien places ({percentage}%)
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
        </div>

        {/* Show correct vs user order */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Classement correct
          </h4>
          {correctOrder.map((item, i) => {
            const userItem = userOrder[i];
            const isCorrect = userItem?.id === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg',
                  isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                )}
              >
                <span className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-500 text-xs font-medium flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {!isCorrect && userItem && (
                  <span className="text-xs text-muted-foreground">
                    (vous : {userItem.label})
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-rose-500" />
          <h3 className="text-lg font-semibold">Consigne</h3>
        </div>
        <p className="text-base">{rkData.prompt}</p>
      </div>

      <div className="space-y-2">
        {userOrder.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-500 text-xs font-medium flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <span className="flex-1 text-sm font-medium min-w-0">
              {item.label}
            </span>
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => moveItem(index, 'down')}
                disabled={index === userOrder.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          <Check className="h-4 w-4 mr-2" />
          Valider
        </Button>
      </div>
    </div>
  );
}
