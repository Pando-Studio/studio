// ===========================================
// Composition Engine — Playback ordering
// ===========================================

import type { WidgetData } from '@/components/widgets/types';

// ---------------------------------------------------------------------------
// PlaybackPlan types
// ---------------------------------------------------------------------------

export interface PlaybackStep {
  widgetId: string;
  order: number;
}

export interface PlaybackPlan {
  steps: PlaybackStep[];
  mode: 'sequential' | 'conditional';
}

// ---------------------------------------------------------------------------
// getPlaybackOrder — returns children sorted by `order` field
// ---------------------------------------------------------------------------

export function getPlaybackOrder(widget: WidgetData): WidgetData[] {
  const children = widget.children ?? [];
  return [...children].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ---------------------------------------------------------------------------
// buildPlaybackPlan — produces a PlaybackPlan from a COMPOSED widget
// ---------------------------------------------------------------------------

export function buildPlaybackPlan(widget: WidgetData): PlaybackPlan {
  const ordered = getPlaybackOrder(widget);
  const mode = widget.orchestration?.mode ?? 'sequential';

  return {
    steps: ordered.map((child, index) => ({
      widgetId: child.id,
      order: index,
    })),
    mode,
  };
}
