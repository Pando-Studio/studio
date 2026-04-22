'use client';

import { StickyNote, Tag, ThumbsUp } from 'lucide-react';
import type { WidgetDisplayProps } from '../types';

interface PostItData {
  prompt: string;
  categories?: string[];
  maxPostIts?: number;
  allowVoting?: boolean;
  showLiveResults?: boolean;
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

export function PostitDisplay({ data }: WidgetDisplayProps) {
  const piData = data as unknown as PostItData;

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Question</h3>
        </div>
        <p className="text-base">{piData.prompt}</p>
      </div>

      {/* Categories */}
      {piData.categories && piData.categories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Categories
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {piData.categories.map((cat, index) => (
              <span
                key={index}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${categoryColors[index % categoryColors.length]}`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="flex items-center gap-3 text-sm">
        {piData.maxPostIts && (
          <span className="px-2 py-1 rounded-full bg-muted">
            Max {piData.maxPostIts} post-its
          </span>
        )}
        {piData.allowVoting && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            <ThumbsUp className="h-3 w-3" />
            Vote active
          </span>
        )}
        {piData.showLiveResults && (
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            Temps reel
          </span>
        )}
      </div>
    </div>
  );
}
