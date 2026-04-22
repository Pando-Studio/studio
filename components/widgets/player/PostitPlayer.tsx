'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { StickyNote, Plus, X, Tag } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import type { WidgetDisplayProps } from '../types';

interface PostItData {
  prompt: string;
  categories?: string[];
  maxPostIts?: number;
  allowVoting?: boolean;
}

interface PostItItem {
  id: string;
  text: string;
  category?: string;
}

const categoryColors = [
  'bg-yellow-100 border-yellow-300 text-yellow-800',
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-cyan-100 border-cyan-300 text-cyan-800',
  'bg-red-100 border-red-300 text-red-800',
];

let nextId = 0;
function generateId(): string {
  nextId += 1;
  return `postit-${nextId}-${Date.now()}`;
}

export function PostitPlayer({ data }: WidgetDisplayProps) {
  const piData = data as unknown as PostItData;
  const { trackStart, trackProgress } = usePlayer();

  const [postIts, setPostIts] = useState<PostItItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    piData.categories?.[0]
  );
  const [hasStarted, setHasStarted] = useState(false);

  const maxPostIts = piData.maxPostIts ?? 20;
  const canAdd = postIts.length < maxPostIts && inputValue.trim().length > 0;

  const ensureStarted = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      trackStart();
    }
  }, [hasStarted, trackStart]);

  const handleAdd = () => {
    if (!canAdd) return;
    ensureStarted();

    const newItem: PostItItem = {
      id: generateId(),
      text: inputValue.trim(),
      category: selectedCategory,
    };

    const newPostIts = [...postIts, newItem];
    setPostIts(newPostIts);
    setInputValue('');
    trackProgress(Math.min(newPostIts.length / maxPostIts, 1));
  };

  const handleRemove = (id: string) => {
    const newPostIts = postIts.filter((p) => p.id !== id);
    setPostIts(newPostIts);
    trackProgress(Math.min(newPostIts.length / maxPostIts, 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canAdd) {
      e.preventDefault();
      handleAdd();
    }
  };

  const getCategoryColor = (category: string): string => {
    const idx = piData.categories?.indexOf(category) ?? 0;
    return categoryColors[idx % categoryColors.length] ?? categoryColors[0]!;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Post-its</h3>
        </div>
        <p className="text-base">{piData.prompt}</p>
      </div>

      {/* Category selector */}
      {piData.categories && piData.categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Categorie</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {piData.categories.map((cat, index) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                  categoryColors[index % categoryColors.length],
                  selectedCategory === cat
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'opacity-60 hover:opacity-100'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ecrivez un post-it..."
          className="flex-1"
          disabled={postIts.length >= maxPostIts}
        />
        <Button onClick={handleAdd} disabled={!canAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        {postIts.length} / {maxPostIts} post-its
      </div>

      {/* Post-its grid */}
      {postIts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {postIts.map((item) => (
            <div
              key={item.id}
              className={cn(
                'relative p-3 border rounded-lg text-sm min-h-[80px]',
                item.category
                  ? getCategoryColor(item.category)
                  : 'bg-yellow-100 border-yellow-300 text-yellow-800'
              )}
            >
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="absolute top-1 right-1 p-0.5 rounded hover:bg-black/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="pr-4">{item.text}</p>
              {item.category && (
                <p className="text-[10px] mt-2 opacity-60">{item.category}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {postIts.length === 0 && (
        <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
          <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Ajoutez vos post-its ci-dessus</p>
        </div>
      )}
    </div>
  );
}
