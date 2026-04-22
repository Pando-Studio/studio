'use client';

import { useEffect, useRef } from 'react';
import { FileText, Boxes, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MentionItem, MentionCategory } from '@/hooks/use-mentions';

const categoryConfig: Record<MentionCategory, { icon: typeof FileText; label: string; color: string }> = {
  Source: { icon: FileText, label: 'Sources', color: 'text-yellow-600 bg-yellow-100' },
  Widget: { icon: Boxes, label: 'Widgets', color: 'text-blue-600 bg-blue-100' },
  Conversation: { icon: MessageSquare, label: 'Conversations', color: 'text-purple-600 bg-purple-100' },
};

interface MentionDropdownProps {
  items: MentionItem[];
  highlightIndex: number;
  onSelect: (item: MentionItem) => void;
  /** Position relative to the textarea */
  className?: string;
}

export function MentionDropdown({ items, highlightIndex, onSelect, className }: MentionDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  if (items.length === 0) {
    return (
      <div className={cn(
        'absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3',
        className,
      )}>
        <p className="text-sm text-muted-foreground text-center">Aucun resultat</p>
      </div>
    );
  }

  // Group items by category
  const grouped = new Map<MentionCategory, MentionItem[]>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  let globalIndex = 0;

  return (
    <div
      ref={listRef}
      className={cn(
        'absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto',
        className,
      )}
    >
      <div className="p-1">
        {Array.from(grouped.entries()).map(([category, categoryItems]) => {
          const config = categoryConfig[category];
          const Icon = config.icon;
          return (
            <div key={category}>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {config.label}
              </div>
              {categoryItems.map((item) => {
                const idx = globalIndex++;
                const isHighlighted = idx === highlightIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-left transition-colors',
                      isHighlighted ? 'bg-primary/10' : 'hover:bg-gray-50',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent textarea blur
                      onSelect(item);
                    }}
                  >
                    <div className={cn('p-1 rounded', config.color)}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
