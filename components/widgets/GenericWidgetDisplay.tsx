'use client';

import type { WidgetDisplayProps } from './types';

export function GenericWidgetDisplay({ data }: WidgetDisplayProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Apercu generique du widget
      </p>
      <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[60vh] whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
