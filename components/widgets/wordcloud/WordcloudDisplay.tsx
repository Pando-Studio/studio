'use client';

import { MessageSquare, Hash, Type } from 'lucide-react';
import type { WidgetDisplayProps } from '../types';

interface WordcloudData {
  prompt: string;
  maxWords?: number;
  minWordLength?: number;
  maxWordLength?: number;
  showLiveResults?: boolean;
}

export function WordcloudDisplay({ data }: WidgetDisplayProps) {
  const wcData = data as unknown as WordcloudData;

  return (
    <div className="space-y-6">
      {/* Main prompt */}
      <div className="p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
        <MessageSquare className="h-8 w-8 mx-auto text-primary mb-3" />
        <p className="text-lg font-medium">{wcData.prompt}</p>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-3">
        {wcData.maxWords && (
          <div className="flex items-center gap-2 p-3 rounded-lg border">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Max mots</p>
              <p className="text-sm font-medium">{wcData.maxWords}</p>
            </div>
          </div>
        )}
        {wcData.minWordLength && (
          <div className="flex items-center gap-2 p-3 rounded-lg border">
            <Type className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Long. min</p>
              <p className="text-sm font-medium">{wcData.minWordLength} car.</p>
            </div>
          </div>
        )}
        {wcData.maxWordLength && (
          <div className="flex items-center gap-2 p-3 rounded-lg border">
            <Type className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Long. max</p>
              <p className="text-sm font-medium">{wcData.maxWordLength} car.</p>
            </div>
          </div>
        )}
        {wcData.showLiveResults !== undefined && (
          <div className="flex items-center gap-2 p-3 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground">Resultats en direct</p>
              <p className="text-sm font-medium">{wcData.showLiveResults ? 'Oui' : 'Non'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
