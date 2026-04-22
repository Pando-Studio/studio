'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from './types';

export function GenericWidgetEditor({ data, onSave }: WidgetEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(data, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setError(null);
      onSave(parsed);
    } catch {
      setError('JSON invalide');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Editeur generique — modifiez le JSON directement
      </p>
      <textarea
        className="w-full min-h-[400px] px-3 py-2 border rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        value={jsonText}
        onChange={(e) => {
          setJsonText(e.target.value);
          setError(null);
        }}
      />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
