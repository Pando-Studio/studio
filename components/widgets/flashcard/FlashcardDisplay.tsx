'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import { RotateCcw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Layers } from 'lucide-react';
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

export function FlashcardDisplay({ data }: WidgetDisplayProps) {
  const flashcardData = data as unknown as FlashcardData;

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

  if (!cards.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune carte disponible.
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const knownCount = Object.values(scores).filter(Boolean).length;
  const totalScored = Object.keys(scores).length;

  const handleScore = (knew: boolean) => {
    if (!currentCard) return;
    setScores((prev) => ({ ...prev, [currentCard.id]: knew }));
    goNext();
  };

  const goNext = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const reset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScores({});
  };

  return (
    <div className="space-y-4">
      {flashcardData.title && (
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{flashcardData.title}</h3>
        </div>
      )}

      {flashcardData.showProgress !== false && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Carte {currentIndex + 1} / {cards.length}
          </span>
          {flashcardData.enableSelfScoring && totalScored > 0 && (
            <span>
              {knownCount}/{totalScored} maitrisees
            </span>
          )}
        </div>
      )}

      {currentCard && (
        <Card
          className={cn(
            'min-h-[200px] flex items-center justify-center p-8 cursor-pointer transition-all select-none',
            isFlipped ? 'bg-primary/5 border-primary/30' : 'hover:border-primary/20',
          )}
          onClick={() => setIsFlipped((prev) => !prev)}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              {isFlipped ? 'Reponse' : 'Question'}
            </p>
            <p className={cn('text-lg', isFlipped ? 'text-muted-foreground' : 'font-semibold')}>
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
            {!isFlipped && (
              <p className="text-xs text-muted-foreground mt-4">Cliquez pour retourner</p>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0}>
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
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
