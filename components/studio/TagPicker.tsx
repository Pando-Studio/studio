'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, Check, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTags, useCreateTag, useTagSource, useUntagSource } from '@/hooks/use-tags';
import type { DocumentTag } from '@/hooks/use-tags';
import { Button } from '@/components/ui';

interface TagPickerProps {
  sourceId: string;
  sourceTags: string[]; // tag IDs currently on the source
  onTagsChanged: () => void;
}

const TAG_COLORS = [
  '#6B7280', // gray
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
];

export function TagPicker({ sourceId, sourceTags, onTagsChanged }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const tagSource = useTagSource();
  const untagSource = useUntagSource();

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleToggleTag = useCallback(
    async (tag: DocumentTag) => {
      const isTagged = sourceTags.includes(tag.id);
      if (isTagged) {
        await untagSource.mutateAsync({ sourceId, tagId: tag.id });
      } else {
        await tagSource.mutateAsync({ sourceId, tagId: tag.id });
      }
      onTagsChanged();
    },
    [sourceId, sourceTags, tagSource, untagSource, onTagsChanged],
  );

  const handleCreateTag = useCallback(async () => {
    const name = newTagName.trim();
    if (!name) return;

    const created = await createTag.mutateAsync({ name, color: selectedColor });
    setNewTagName('');
    // Immediately tag the source with the new tag
    await tagSource.mutateAsync({ sourceId, tagId: created.id });
    onTagsChanged();
  }, [newTagName, selectedColor, createTag, tagSource, sourceId, onTagsChanged]);

  const isMutating = tagSource.isPending || untagSource.isPending || createTag.isPending;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover/source:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Gerer les tags"
      >
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-2 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tag list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Aucun tag</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2">
              {tags.map((tag) => {
                const isTagged = sourceTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors',
                      'hover:bg-muted',
                      isMutating && 'opacity-50 pointer-events-none',
                    )}
                    onClick={() => handleToggleTag(tag)}
                    disabled={isMutating}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-left truncate">{tag.name}</span>
                    {isTagged && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          <div className="border-t my-1" />

          {/* Create new tag */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                className="flex-1 h-7 px-2 text-xs rounded border bg-transparent placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Ajouter un tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTag.isPending}
              >
                {createTag.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Color picker row */}
            <div className="flex items-center gap-1 px-0.5">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'h-4 w-4 rounded-full transition-all',
                    selectedColor === color && 'ring-2 ring-offset-1 ring-primary',
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
