'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface PostItData {
  prompt: string;
  categories?: string[];
  maxPostIts?: number;
  allowVoting?: boolean;
  showLiveResults?: boolean;
}

export function PostitEditor({ data, onSave }: WidgetEditorProps) {
  const [piData, setPiData] = useState<PostItData>(() => ({
    prompt: '',
    categories: [],
    maxPostIts: 5,
    allowVoting: true,
    showLiveResults: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as PostItData));
  const [errors, setErrors] = useState<string[]>([]);

  const addCategory = () => {
    setPiData((prev) => ({
      ...prev,
      categories: [...(prev.categories || []), ''],
    }));
  };

  const updateCategory = (index: number, value: string) => {
    setPiData((prev) => ({
      ...prev,
      categories: (prev.categories || []).map((c, i) => (i === index ? value : c)),
    }));
  };

  const removeCategory = (index: number) => {
    setPiData((prev) => ({
      ...prev,
      categories: (prev.categories || []).filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!piData.prompt.trim()) errs.push('Le prompt est obligatoire');
    (piData.categories || []).forEach((c, i) => {
      if (!c.trim()) errs.push(`Categorie ${i + 1}: texte manquant`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(piData as unknown as Record<string, unknown>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Question / Theme</Label>
        <textarea
          id="prompt"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Question pour le brainstorming..."
          value={piData.prompt}
          onChange={(e) => setPiData((prev) => ({ ...prev, prompt: e.target.value }))}
        />
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Categories ({(piData.categories || []).length})</Label>
          <Button variant="outline" size="sm" onClick={addCategory}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {(piData.categories || []).map((cat, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={cat}
              onChange={(e) => updateCategory(index, e.target.value)}
              placeholder={`Categorie ${index + 1}...`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive h-8 w-8 p-0"
              onClick={() => removeCategory(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-3 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="maxPostIts">Post-its max par participant</Label>
          <Input
            id="maxPostIts"
            type="number"
            min={1}
            max={20}
            value={piData.maxPostIts || 5}
            onChange={(e) =>
              setPiData((prev) => ({ ...prev, maxPostIts: parseInt(e.target.value) || 5 }))
            }
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!piData.allowVoting}
            onChange={(e) => setPiData((prev) => ({ ...prev, allowVoting: e.target.checked }))}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Autoriser le vote</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!piData.showLiveResults}
            onChange={(e) => setPiData((prev) => ({ ...prev, showLiveResults: e.target.checked }))}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Resultats en direct</span>
        </label>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1 text-sm text-destructive">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
