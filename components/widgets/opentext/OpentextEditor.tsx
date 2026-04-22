'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface OpenTextData {
  prompt: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  timeLimit?: number;
  showLiveResults?: boolean;
}

export function OpentextEditor({ data, onSave }: WidgetEditorProps) {
  const [otData, setOtData] = useState<OpenTextData>(() => ({
    prompt: '',
    placeholder: '',
    minLength: 10,
    maxLength: 500,
    showLiveResults: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as OpenTextData));
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!otData.prompt.trim()) errs.push('La question est obligatoire');
    if (otData.minLength != null && otData.maxLength != null && otData.minLength > otData.maxLength) {
      errs.push('La longueur minimale doit etre inferieure a la maximale');
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(otData as unknown as Record<string, unknown>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Question de reflexion</Label>
        <textarea
          id="prompt"
          className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Posez votre question ouverte..."
          value={otData.prompt}
          onChange={(e) => setOtData((prev) => ({ ...prev, prompt: e.target.value }))}
        />
      </div>

      {/* Placeholder */}
      <div className="space-y-2">
        <Label htmlFor="placeholder">Texte d&apos;aide (placeholder)</Label>
        <Input
          id="placeholder"
          placeholder="Ecrivez votre reponse ici..."
          value={otData.placeholder || ''}
          onChange={(e) => setOtData((prev) => ({ ...prev, placeholder: e.target.value }))}
        />
      </div>

      {/* Length settings */}
      <div className="space-y-3 border-t pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minLength">Longueur min (caracteres)</Label>
            <Input
              id="minLength"
              type="number"
              min={0}
              max={500}
              value={otData.minLength ?? ''}
              onChange={(e) =>
                setOtData((prev) => ({
                  ...prev,
                  minLength: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxLength">Longueur max (caracteres)</Label>
            <Input
              id="maxLength"
              type="number"
              min={50}
              max={5000}
              value={otData.maxLength ?? ''}
              onChange={(e) =>
                setOtData((prev) => ({
                  ...prev,
                  maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeLimit">Temps limite (secondes, optionnel)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={30}
            max={600}
            placeholder="Pas de limite"
            value={otData.timeLimit || ''}
            onChange={(e) =>
              setOtData((prev) => ({
                ...prev,
                timeLimit: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!otData.showLiveResults}
            onChange={(e) => setOtData((prev) => ({ ...prev, showLiveResults: e.target.checked }))}
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
