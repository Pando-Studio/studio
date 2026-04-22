'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface WordcloudData {
  prompt: string;
  maxWords?: number;
  minWordLength?: number;
  maxWordLength?: number;
  showLiveResults?: boolean;
}

export function WordcloudEditor({ data, onSave }: WidgetEditorProps) {
  const [wcData, setWcData] = useState<WordcloudData>(() => ({
    prompt: '',
    maxWords: 30,
    minWordLength: 2,
    showLiveResults: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as WordcloudData));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!wcData.prompt.trim()) {
      setError('Le prompt est obligatoire');
      return;
    }
    setError(null);
    onSave(wcData as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="prompt">Question / Prompt</Label>
        <textarea
          id="prompt"
          className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Question posee aux participants..."
          value={wcData.prompt}
          onChange={(e) => setWcData((prev) => ({ ...prev, prompt: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxWords">Max mots affiches</Label>
          <Input
            id="maxWords"
            type="number"
            min={5}
            max={100}
            value={wcData.maxWords || ''}
            onChange={(e) =>
              setWcData((prev) => ({ ...prev, maxWords: parseInt(e.target.value) || undefined }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minWordLength">Longueur min (car.)</Label>
          <Input
            id="minWordLength"
            type="number"
            min={1}
            max={10}
            value={wcData.minWordLength || ''}
            onChange={(e) =>
              setWcData((prev) => ({ ...prev, minWordLength: parseInt(e.target.value) || undefined }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxWordLength">Longueur max (car.)</Label>
          <Input
            id="maxWordLength"
            type="number"
            min={10}
            max={50}
            value={wcData.maxWordLength || ''}
            onChange={(e) =>
              setWcData((prev) => ({ ...prev, maxWordLength: parseInt(e.target.value) || undefined }))
            }
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!wcData.showLiveResults}
          onChange={(e) =>
            setWcData((prev) => ({ ...prev, showLiveResults: e.target.checked }))
          }
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm">Resultats en direct</span>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
