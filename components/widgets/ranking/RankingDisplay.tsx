'use client';

import { ArrowUpDown, Clock, GripVertical } from 'lucide-react';
import type { WidgetDisplayProps } from '../types';

interface RankingItem {
  id: string;
  label: string;
  description?: string;
}

interface RankingData {
  prompt: string;
  items: RankingItem[];
  timeLimit?: number;
  showLiveResults?: boolean;
}

export function RankingDisplay({ data }: WidgetDisplayProps) {
  const rkData = data as unknown as RankingData;

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-rose-500" />
          <h3 className="text-lg font-semibold">Consigne</h3>
        </div>
        <p className="text-base">{rkData.prompt}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-sm">
        <span className="px-2 py-1 rounded-full bg-muted">
          {rkData.items?.length || 0} elements
        </span>
        {rkData.timeLimit && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
            <Clock className="h-3.5 w-3.5" />
            {rkData.timeLimit}s
          </span>
        )}
        {rkData.showLiveResults && (
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            Temps reel
          </span>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Elements a classer
        </h4>
        <div className="space-y-2">
          {rkData.items?.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50/50"
            >
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <GripVertical className="h-4 w-4 text-gray-300" />
                <span className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-500 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
