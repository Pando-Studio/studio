'use client';

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { usePlayer } from './PlayerContext';

const DEFAULT_AUTO_COMPLETE_MS = 30_000;

interface ReadablePlayerProps {
  children: ReactNode;
  autoCompleteAfterMs?: number;
}

export function ReadablePlayer({
  children,
  autoCompleteAfterMs = DEFAULT_AUTO_COMPLETE_MS,
}: ReadablePlayerProps) {
  const { trackStart, trackComplete, trackProgress, isCompleted } = usePlayer();

  const containerRef = useRef<HTMLDivElement>(null);
  const visibleTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(false);

  const startTimer = useCallback(() => {
    if (timerRef.current || isCompleted) return;
    trackStart();
    timerRef.current = setInterval(() => {
      if (!isVisibleRef.current) return;

      visibleTimeRef.current += 1000;
      const progress = Math.min(
        visibleTimeRef.current / autoCompleteAfterMs,
        1
      );
      trackProgress(progress);

      if (visibleTimeRef.current >= autoCompleteAfterMs) {
        trackComplete();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 1000);
  }, [autoCompleteAfterMs, isCompleted, trackStart, trackComplete, trackProgress]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isCompleted) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        isVisibleRef.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          startTimer();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      stopTimer();
    };
  }, [isCompleted, startTimer, stopTimer]);

  return <div ref={containerRef}>{children}</div>;
}
