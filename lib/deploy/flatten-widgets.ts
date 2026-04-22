import type { WidgetData } from '@/components/widgets/types';

export interface DeployableActivity {
  type: string;
  title: string;
  description?: string;
  config: Record<string, unknown>;
  order: number;
}

const DEPLOYABLE_TYPES = new Set([
  'MULTIPLE_CHOICE', 'QUIZ', 'WORDCLOUD', 'POSTIT', 'ROLEPLAY', 'RANKING', 'OPENTEXT',
]);

/**
 * Recursively flatten a widget tree into ordered leaf activities for deployment to Engage.
 * - Only includes READY leaves of deployable types
 * - For COURSE_MODULE, respects slot ordering (intro → activities → assessment)
 * - For SEQUENCE, respects child order
 */
export function flattenWidgetsForDeploy(
  widgets: WidgetData[],
  allWidgets: WidgetData[]
): DeployableActivity[] {
  const result: DeployableActivity[] = [];

  for (const widget of widgets) {
    if (widget.kind === 'LEAF' && DEPLOYABLE_TYPES.has(widget.type) && widget.status === 'READY') {
      result.push({
        type: widget.type,
        title: widget.title,
        description: widget.description,
        config: widget.data,
        order: result.length,
      });
    } else if (widget.kind === 'COMPOSED') {
      // Get children from allWidgets
      let children = allWidgets
        .filter((w) => w.parentId === widget.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // For COURSE_MODULE, sort by slot order
      if (widget.type === 'COURSE_MODULE') {
        const SLOT_ORDER = ['intro', 'activities', 'assessment'];
        children = [...children].sort((a, b) => {
          const aSlotIdx = SLOT_ORDER.indexOf(a.slotId || '');
          const bSlotIdx = SLOT_ORDER.indexOf(b.slotId || '');
          if (aSlotIdx !== bSlotIdx) return aSlotIdx - bSlotIdx;
          return (a.order ?? 0) - (b.order ?? 0);
        });
      }

      // Recursively flatten children
      const childActivities = flattenWidgetsForDeploy(children, allWidgets);
      result.push(...childActivities);
    }
  }

  // Renumber order sequentially
  return result.map((a, i) => ({ ...a, order: i }));
}

/**
 * Check if a widget type is deployable to Engage
 */
export function isDeployableType(type: string): boolean {
  return DEPLOYABLE_TYPES.has(type);
}
