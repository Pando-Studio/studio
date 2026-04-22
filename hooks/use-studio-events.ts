'use client';

import { useEffect, useRef, useCallback } from 'react';

/** Shape of a parsed SSE event from the studio events endpoint. */
export interface StudioEvent {
  type: string;
  [key: string]: unknown;
}

export type StudioEventHandler = (event: StudioEvent) => void;

interface UseStudioEventsOptions {
  /** Studio ID to subscribe to. Pass `null` / `undefined` to disable. */
  studioId: string | null | undefined;
  /** Callback invoked for each incoming event. */
  onEvent: StudioEventHandler;
  /** Whether the connection is enabled (default: true). */
  enabled?: boolean;
}

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const MAX_RETRIES = 10;

/**
 * Hook that opens an SSE connection to `/api/studios/[id]/events` and
 * dispatches parsed events to the provided callback.
 *
 * Implements exponential backoff on error (1s -> 2s -> 4s ... capped at 30s)
 * with a maximum of 10 retries before giving up.
 */
export function useStudioEvents({
  studioId,
  onEvent,
  enabled = true,
}: UseStudioEventsOptions) {
  // Keep latest callback in a ref so reconnects always use the current handler.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(
    (
      id: string,
      signal: AbortSignal,
      retryCount: number,
      retryDelay: number,
    ) => {
      if (signal.aborted) return;

      const url = `/api/studios/${id}/events`;
      const es = new EventSource(url);

      es.onopen = () => {
        if (retryCount > 0) {
          console.info(
            `[useStudioEvents] Reconnected to studio ${id} after ${retryCount} retries`,
          );
        }
        // Reset retry state on successful connection — handled by new
        // connect() calls via onclose/onerror below.
      };

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const parsed: unknown = JSON.parse(e.data);
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            'type' in parsed
          ) {
            onEventRef.current(parsed as StudioEvent);
          }
        } catch {
          // Non-JSON messages (e.g. keepalive noise) are silently ignored.
        }
      };

      es.onerror = () => {
        // EventSource fires onerror for both transient network blips and
        // terminal failures. Close the current source and decide whether to
        // retry.
        es.close();

        if (signal.aborted) return;

        if (retryCount >= MAX_RETRIES) {
          console.error(
            `[useStudioEvents] Max retries (${MAX_RETRIES}) reached for studio ${id}. Giving up.`,
          );
          return;
        }

        const nextRetry = retryCount + 1;
        const nextDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);

        console.warn(
          `[useStudioEvents] Connection lost for studio ${id}. ` +
            `Retry ${nextRetry}/${MAX_RETRIES} in ${retryDelay}ms`,
        );

        setTimeout(() => {
          connect(id, signal, nextRetry, nextDelay);
        }, retryDelay);
      };

      // Cleanup when the effect is torn down.
      signal.addEventListener('abort', () => {
        es.close();
      });
    },
    [],
  );

  useEffect(() => {
    if (!studioId || !enabled) return;

    const controller = new AbortController();
    connect(studioId, controller.signal, 0, INITIAL_RETRY_MS);

    return () => {
      controller.abort();
    };
  }, [studioId, enabled, connect]);
}
