'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer } from './PlayerContext';
import { getPlaybackOrder, buildPlaybackPlan } from '@/lib/composition';
import { getWidgetRenderers } from '../registry';
import type { WidgetDisplayProps } from '../types';
import type { WidgetData } from '../types';
import { PlayerProvider } from './PlayerContext';

export function ComposedPlayer({ data, widget, children: childWidgets }: WidgetDisplayProps) {
  const player = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  // Build playback plan from the widget
  const widgetData = useMemo((): WidgetData | null => {
    if (!widget) return null;
    return {
      ...widget,
      children: childWidgets,
    };
  }, [widget, childWidgets]);

  const orderedChildren = useMemo(() => {
    if (!widgetData) return childWidgets ?? [];
    return getPlaybackOrder(widgetData);
  }, [widgetData, childWidgets]);

  const plan = useMemo(() => {
    if (!widgetData) return null;
    return buildPlaybackPlan(widgetData);
  }, [widgetData]);

  const totalSteps = orderedChildren.length;
  const currentChild = orderedChildren[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  // Navigation
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSteps) return;
      setCurrentIndex(index);
      setVisitedSteps((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      player.trackProgress((index + 1) / totalSteps);
    },
    [totalSteps, player]
  );

  const handlePrevious = useCallback(() => {
    goToStep(currentIndex - 1);
  }, [currentIndex, goToStep]);

  const handleNext = useCallback(() => {
    goToStep(currentIndex + 1);
  }, [currentIndex, goToStep]);

  const handleFinish = useCallback(() => {
    player.trackComplete();
  }, [player]);

  // Track start on first render
  useMemo(() => {
    player.trackStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentChild || totalSteps === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Aucun contenu dans cette composition</p>
      </div>
    );
  }

  // Get the renderer for the current child
  const renderers = getWidgetRenderers(currentChild.type);
  const ChildDisplay = renderers.Player ?? renderers.Display;

  const progressPercent = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>
            Etape {currentIndex + 1} / {totalSteps}
          </span>
          <span className="font-medium truncate ml-2 max-w-[200px]">
            {currentChild.title}
          </span>
        </div>
        {/* Step indicators */}
        <div className="flex gap-1">
          {orderedChildren.map((_, idx) => (
            <button
              key={plan?.steps[idx]?.widgetId ?? idx}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                idx === currentIndex
                  ? 'bg-primary'
                  : visitedSteps.has(idx)
                    ? 'bg-primary/40'
                    : 'bg-muted'
              )}
              onClick={() => goToStep(idx)}
              title={`Etape ${idx + 1}`}
            />
          ))}
        </div>
        {/* Numeric progress */}
        <div className="w-full bg-muted rounded-full h-0.5 mt-1.5">
          <div
            className="bg-primary h-0.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Child content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        <PlayerProvider
          key={currentChild.id}
          role={player.role}
          userId={player.userId}
          widgetId={currentChild.id}
          studioId={player.studioId}
        >
          <ChildDisplay
            data={currentChild.data}
            widget={currentChild}
            children={currentChild.children}
          />
        </PlayerProvider>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={isFirst}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Precedent
        </Button>

        <div className="text-xs text-muted-foreground">
          {visitedSteps.size} / {totalSteps} vus
        </div>

        {isLast ? (
          <Button
            size="sm"
            onClick={handleFinish}
            disabled={player.isCompleted}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            {player.isCompleted ? 'Termine' : 'Terminer'}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleNext}
            className="gap-1.5"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
