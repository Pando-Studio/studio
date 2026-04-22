'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

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

export function RankingEditor({ data, onSave }: WidgetEditorProps) {
  const [rkData, setRkData] = useState<RankingData>(() => ({
    prompt: '',
    items: [],
    showLiveResults: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as RankingData));
  const [errors, setErrors] = useState<string[]>([]);

  const addItem = () => {
    setRkData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: crypto.randomUUID(), label: '', description: '' },
      ],
    }));
  };

  const updateItem = (index: number, updates: Partial<RankingItem>) => {
    setRkData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }));
  };

  const removeItem = (index: number) => {
    setRkData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!rkData.prompt.trim()) errs.push('La consigne est obligatoire');
    if (rkData.items.length < 3) errs.push('Au moins 3 elements requis');
    rkData.items.forEach((item, i) => {
      if (!item.label.trim()) errs.push(`Element ${i + 1}: label manquant`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(rkData as unknown as Record<string, unknown>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Consigne de classement</Label>
        <textarea
          id="prompt"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Classez les elements suivants par..."
          value={rkData.prompt}
          onChange={(e) => setRkData((prev) => ({ ...prev, prompt: e.target.value }))}
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Elements ({rkData.items.length})</Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {rkData.items.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Element {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={item.label}
              onChange={(e) => updateItem(index, { label: e.target.value })}
              placeholder="Label court..."
            />
            <Input
              value={item.description || ''}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              placeholder="Description (optionnelle)..."
            />
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-3 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="timeLimit">Temps limite (secondes, optionnel)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={30}
            max={600}
            placeholder="Pas de limite"
            value={rkData.timeLimit || ''}
            onChange={(e) =>
              setRkData((prev) => ({
                ...prev,
                timeLimit: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!rkData.showLiveResults}
            onChange={(e) => setRkData((prev) => ({ ...prev, showLiveResults: e.target.checked }))}
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
