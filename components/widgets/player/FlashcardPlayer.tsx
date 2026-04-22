'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Layers,
} from 'lucide-react';
import { usePlayer } from './PlayerContext';
import type { WidgetDisplayProps } from '../types';

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

interface FlashcardData {
  title?: string;
  cards: FlashcardItem[];
  shuffleOnStart?: boolean;
  showProgress?: boolean;
  enableSelfScoring?: boolean;
}

export function FlashcardPlayer({ data }: WidgetDisplayProps) {
  const flashcardData = data as unknown as FlashcardData;
  const { trackStart, trackComplete, trackProgress } = usePlayer();

  const cards = useMemo(() => {
    const c = flashcardData.cards ?? [];
    if (flashcardData.shuffleOnStart) {
      return [...c].sort(() => Math.random() - 0.5);
    }
    return c;
  }, [flashcardData.cards, flashcardData.shuffleOnStart]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [scores, setScores] = useState<Record<string, boolean>>({});
  const [hasStarted, setHasStarted] = useState(false);

  const totalCards = cards.length;
  const knownCount = Object.values(scores).filter(Boolean).length;
  const totalScored = Object.keys(scores).length;

  const ensureStarted = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      trackStart();
    }
  }, [hasStarted, trackStart]);

  const handleFlip = () => {
    ensureStarted();
    setIsFlipped((prev) => !prev);
  };

  const goTo = (index: number) => {
    ensureStarted();
    setIsFlipped(false);
    setCurrentIndex(index);
    // Track progress based on furthest card seen
    const progress = Math.min((index + 1) / totalCards, 1);
    trackProgress(progress);
  };

  const handleScore = (knew: boolean) => {
    const card = cards[currentIndex];
    if (!card) return;
    const newScores = { ...scores, [card.id]: knew };
    setScores(newScores);

    const newTotalScored = Object.keys(newScores).length;
    if (newTotalScored === totalCards) {
      const correctCount = Object.values(newScores).filter(Boolean).length;
      trackComplete(correctCount, totalCards);
    }

    // Go to next card
    if (currentIndex < totalCards - 1) {
      goTo(currentIndex + 1);
    }
  };

  const reset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScores({});
    setHasStarted(false);
  };

  if (!totalCards) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune carte disponible.
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="space-y-4">
      {flashcardData.title && (
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{flashcardData.title}</h3>
        </div>
      )}

      {flashcardData.showProgress !== false && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Carte {currentIndex + 1} / {totalCards}
            </span>
            {flashcardData.enableSelfScoring && totalScored > 0 && (
              <span>
                {knownCount}/{totalScored} maitrisees
              </span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
            />
          </div>
        </div>
      )}

      {currentCard && (
        <Card
          className={cn(
            'min-h-[200px] flex items-center justify-center p-8 cursor-pointer transition-all select-none',
            isFlipped
              ? 'bg-primary/5 border-primary/30'
              : 'hover:border-primary/20'
          )}
          onClick={handleFlip}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              {isFlipped ? 'Reponse' : 'Question'}
            </p>
            <p
              className={cn(
                'text-lg',
                isFlipped ? 'text-muted-foreground' : 'font-semibold'
              )}
            >
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
            {!isFlipped && (
              <p className="text-xs text-muted-foreground mt-4">
                Cliquez pour retourner
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Precedent
        </Button>

        {flashcardData.enableSelfScoring && isFlipped ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleScore(false)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Pas su
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleScore(true)}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Su
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Recommencer
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === totalCards - 1}
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
