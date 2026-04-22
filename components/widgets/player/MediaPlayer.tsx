'use client';

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type RefObject,
} from 'react';
import { usePlayer } from './PlayerContext';

const DEFAULT_COMPLETION_THRESHOLD = 0.9;

interface MediaPlayerProps {
  children: ReactNode;
  completionThreshold?: number;
}

/**
 * Finds the first <audio> or <video> element inside the container.
 */
function findMediaElement(
  container: HTMLDivElement
): HTMLMediaElement | null {
  return (
    container.querySelector('video') ?? container.querySelector('audio')
  );
}

function useMediaTracking(
  containerRef: RefObject<HTMLDivElement | null>,
  completionThreshold: number
) {
  const { trackStart, trackComplete, trackProgress, isCompleted } = usePlayer();
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const handleTimeUpdate = useCallback(
    (e: Event) => {
      const media = e.target as HTMLMediaElement;
      if (!media.duration || isNaN(media.duration)) return;

      const progress = media.currentTime / media.duration;
      trackProgress(progress);

      if (
        progress >= completionThreshold &&
        !hasCompletedRef.current &&
        !isCompleted
      ) {
        hasCompletedRef.current = true;
        trackComplete();
      }
    },
    [completionThreshold, isCompleted, trackComplete, trackProgress]
  );

  const handlePlay = useCallback(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackStart();
    }
  }, [trackStart]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isCompleted) return;

    // Use MutationObserver to handle lazy-rendered media elements
    let media = findMediaElement(container);

    const attach = (el: HTMLMediaElement) => {
      el.addEventListener('timeupdate', handleTimeUpdate);
      el.addEventListener('play', handlePlay);
    };

    const detach = (el: HTMLMediaElement) => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('play', handlePlay);
    };

    if (media) {
      attach(media);
    }

    const observer = new MutationObserver(() => {
      const newMedia = findMediaElement(container);
      if (newMedia && newMedia !== media) {
        if (media) detach(media);
        media = newMedia;
        attach(media);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (media) detach(media);
    };
  }, [containerRef, isCompleted, handleTimeUpdate, handlePlay]);
}

export function MediaPlayer({
  children,
  completionThreshold = DEFAULT_COMPLETION_THRESHOLD,
}: MediaPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useMediaTracking(containerRef, completionThreshold);

  return <div ref={containerRef}>{children}</div>;
}
