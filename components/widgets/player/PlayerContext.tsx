'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

export interface PlayerContextValue {
  role: 'owner' | 'editor' | 'viewer';
  userId?: string;
  widgetId: string;
  studioId: string;
  trackStart: () => void;
  trackComplete: (score?: number, maxScore?: number) => void;
  trackProgress: (progress: number) => void;
  isCompleted: boolean;
  startedAt?: Date;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return ctx;
}

export function usePlayerOptional(): PlayerContextValue | null {
  return useContext(PlayerContext);
}

interface PlayerProviderProps {
  children: ReactNode;
  role: 'owner' | 'editor' | 'viewer';
  userId?: string;
  widgetId: string;
  studioId: string;
}

export function PlayerProvider({
  children,
  role,
  userId,
  widgetId,
  studioId,
}: PlayerProviderProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | undefined>(undefined);
  const progressRef = useRef(0);
  const hasStartedRef = useRef(false);

  const trackStart = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setStartedAt(new Date());
  }, []);

  const trackComplete = useCallback(
    async (score?: number, maxScore?: number) => {
      if (isCompleted) return;
      setIsCompleted(true);

      const duration = startedAt
        ? Math.round((Date.now() - startedAt.getTime()) / 1000)
        : undefined;

      try {
        await fetch(
          `/api/studios/${studioId}/widgets/${widgetId}/play-result`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'completed',
              score,
              maxScore,
              duration,
              progress: 1,
              userId,
            }),
          }
        );
      } catch {
        // Silently fail — tracking should not break the player experience
      }
    },
    [isCompleted, startedAt, studioId, widgetId, userId]
  );

  const trackProgress = useCallback((progress: number) => {
    const clamped = Math.max(0, Math.min(1, progress));
    progressRef.current = clamped;
  }, []);

  const value: PlayerContextValue = {
    role,
    userId,
    widgetId,
    studioId,
    trackStart,
    trackComplete,
    trackProgress,
    isCompleted,
    startedAt,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
