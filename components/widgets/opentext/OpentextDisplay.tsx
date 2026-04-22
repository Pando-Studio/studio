'use client';

import { FileText, Clock, Type } from 'lucide-react';
import type { WidgetDisplayProps } from '../types';

interface OpenTextData {
  prompt: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  timeLimit?: number;
  showLiveResults?: boolean;
}

export function OpentextDisplay({ data }: WidgetDisplayProps) {
  const otData = data as unknown as OpenTextData;

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-semibold">Question ouverte</h3>
        </div>
        <p className="text-base">{otData.prompt}</p>
      </div>

      {/* Placeholder preview */}
      {otData.placeholder && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Texte d&apos;aide
          </h4>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-muted-foreground italic">{otData.placeholder}</p>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {otData.minLength != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
            <Type className="h-3.5 w-3.5" />
            Min {otData.minLength} car.
          </span>
        )}
        {otData.maxLength != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
            <Type className="h-3.5 w-3.5" />
            Max {otData.maxLength} car.
          </span>
        )}
        {otData.timeLimit && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
            <Clock className="h-3.5 w-3.5" />
            {otData.timeLimit}s
          </span>
        )}
        {otData.showLiveResults && (
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            Temps reel
          </span>
        )}
      </div>
    </div>
  );
}
