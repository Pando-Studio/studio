/**
 * Studio real-time events via Redis pub/sub.
 *
 * Workers PUBLISH events → SSE endpoint SUBSCRIBES → Browser receives via EventSource.
 * Replaces polling for source indexing, widget generation, etc.
 */

import { redisPub } from '@/lib/redis';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type StudioEventType =
  | 'source:status'
  | 'generation:progress'
  | 'generation:complete'
  | 'widget:updated'
  | 'research:progress'
  | 'plan:step-complete'
  | 'plan:complete';

export interface StudioEvent {
  type: StudioEventType;
  studioId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Channel naming
// ---------------------------------------------------------------------------

export function studioChannel(studioId: string): string {
  return `studio:${studioId}:events`;
}

// ---------------------------------------------------------------------------
// Publish (called from workers / API routes)
// ---------------------------------------------------------------------------

export async function publishStudioEvent(
  studioId: string,
  type: StudioEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const event: StudioEvent = {
    type,
    studioId,
    data,
    timestamp: Date.now(),
  };
  await redisPub.publish(studioChannel(studioId), JSON.stringify(event));
}
