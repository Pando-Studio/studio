'use client';

import type { WidgetDisplayProps } from '../types';
import { Image as ImageIcon } from 'lucide-react';

export function ImageDisplay({ data }: WidgetDisplayProps) {
  const imageUrl = data.imageUrl as string | undefined;
  const prompt = data.prompt as string | undefined;
  const model = data.model as string | undefined;
  const style = data.style as string | undefined;

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2" />
        <p className="text-sm">Aucune image generee</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border">
        <img
          src={imageUrl}
          alt={prompt || 'Image generee'}
          className="w-full h-auto object-contain max-h-[500px]"
        />
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        {prompt && (
          <p>
            <span className="font-medium text-foreground">Prompt :</span> {prompt}
          </p>
        )}
        <div className="flex gap-3">
          {model && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted">
              {model}
            </span>
          )}
          {style && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted">
              {style}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
