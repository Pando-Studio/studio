import { describe, it, expect } from 'vitest';
import { getPlaybackOrder, buildPlaybackPlan } from '@/lib/composition/engine';
import type { WidgetData } from '@/components/widgets/types';

function makeWidget(overrides: Partial<WidgetData> = {}): WidgetData {
  return {
    id: 'root',
    studioId: 'studio-1',
    type: 'SEQUENCE',
    title: 'Test Sequence',
    data: {},
    status: 'READY',
    order: 0,
    kind: 'COMPOSED',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeChild(id: string, order: number): WidgetData {
  return makeWidget({
    id,
    type: 'SLIDE',
    kind: 'LEAF',
    order,
    title: `Slide ${id}`,
  });
}

describe('getPlaybackOrder', () => {
  it('sorts children by order field', () => {
    const widget = makeWidget({
      children: [makeChild('c', 3), makeChild('a', 1), makeChild('b', 2)],
    });

    const ordered = getPlaybackOrder(widget);

    expect(ordered.map((w) => w.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array when widget has no children', () => {
    const widget = makeWidget({ children: undefined });
    expect(getPlaybackOrder(widget)).toEqual([]);
  });

  it('handles children with same order', () => {
    const widget = makeWidget({
      children: [makeChild('x', 1), makeChild('y', 1)],
    });

    const ordered = getPlaybackOrder(widget);
    expect(ordered).toHaveLength(2);
  });
});

describe('buildPlaybackPlan', () => {
  it('returns correct PlaybackPlan format', () => {
    const widget = makeWidget({
      children: [makeChild('s1', 0), makeChild('s2', 1), makeChild('s3', 2)],
    });

    const plan = buildPlaybackPlan(widget);

    expect(plan.mode).toBe('sequential');
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]).toEqual({ widgetId: 's1', order: 0 });
    expect(plan.steps[1]).toEqual({ widgetId: 's2', order: 1 });
    expect(plan.steps[2]).toEqual({ widgetId: 's3', order: 2 });
  });

  it('returns empty steps when widget has no children', () => {
    const widget = makeWidget({ children: [] });
    const plan = buildPlaybackPlan(widget);

    expect(plan.steps).toEqual([]);
    expect(plan.mode).toBe('sequential');
  });

  it('uses orchestration mode when set', () => {
    const widget = makeWidget({
      orchestration: { mode: 'conditional', transitions: [] },
      children: [makeChild('s1', 0)],
    });

    const plan = buildPlaybackPlan(widget);
    expect(plan.mode).toBe('conditional');
  });
});
