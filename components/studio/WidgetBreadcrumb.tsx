'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetData } from '@/components/widgets/types';

interface WidgetBreadcrumbProps {
  widget: WidgetData;
  studioId: string;
  onNavigateToParent?: (parentId: string) => void;
  onNavigateToChild?: (childId: string) => void;
  className?: string;
}

interface ParentInfo {
  id: string;
  title: string;
  type: string;
}

export function WidgetBreadcrumb({
  widget,
  studioId,
  onNavigateToParent,
  onNavigateToChild: _onNavigateToChild,
  className,
}: WidgetBreadcrumbProps) {
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [isLoadingParent, setIsLoadingParent] = useState(false);

  const childCount = widget.children?.length ?? 0;

  // Fetch parent info if widget has a parentId
  useEffect(() => {
    if (!widget.parentId) {
      setParent(null);
      return;
    }

    let cancelled = false;
    setIsLoadingParent(true);

    fetch(`/api/studios/${studioId}/widgets/${widget.parentId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch parent');
        return res.json();
      })
      .then((data: { widget: ParentInfo }) => {
        if (!cancelled) {
          setParent({
            id: data.widget.id,
            title: data.widget.title,
            type: data.widget.type,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setParent(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingParent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [widget.parentId, studioId]);

  // Nothing to show if no parent and no children
  if (!widget.parentId && childCount === 0) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      {/* Parent breadcrumb */}
      {widget.parentId && parent && (
        <>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline truncate max-w-[150px]"
            onClick={() => onNavigateToParent?.(parent.id)}
            title={`Aller au parent : ${parent.title}`}
          >
            {parent.title}
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate max-w-[200px]">
            {widget.title}
          </span>
        </>
      )}

      {/* Loading state */}
      {widget.parentId && isLoadingParent && (
        <>
          <span className="text-muted-foreground animate-pulse">...</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate max-w-[200px]">
            {widget.title}
          </span>
        </>
      )}

      {/* Children indicator */}
      {childCount > 0 && (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground',
            widget.parentId ? 'ml-2' : ''
          )}
          title={`${childCount} sous-widget${childCount > 1 ? 's' : ''}`}
        >
          <Layers className="h-3 w-3" />
          {childCount}
        </span>
      )}
    </div>
  );
}
