'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

const STYLE_OPTIONS = [
  { value: 'photo', label: 'Photo realiste' },
  { value: 'illustration', label: 'Illustration' },
  { value: '3d', label: 'Rendu 3D' },
  { value: 'art', label: 'Art / Peinture' },
];

const RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 (Paysage)' },
  { value: '1:1', label: '1:1 (Carre)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '9:16', label: '9:16 (Portrait)' },
];

export function ImageEditor({ data, onSave, widget }: WidgetEditorProps) {
  const [prompt, setPrompt] = useState((data.prompt as string) || '');
  const [style, setStyle] = useState((data.style as string) || 'photo');
  const [aspectRatio, setAspectRatio] = useState((data.aspectRatio as string) || '16:9');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = data.imageUrl as string | undefined;
  const model = data.model as string | undefined;

  const handleSave = () => {
    onSave({
      ...data,
      prompt,
      style,
      aspectRatio,
    });
  };

  const handleRegenerate = async () => {
    if (!widget || !prompt) return;
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/studios/${widget.studioId}/widgets/${widget.id}/regenerate-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, style, aspectRatio }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setError(errBody.error || `Erreur ${response.status}`);
        return;
      }

      const result = await response.json();
      onSave({
        ...data,
        prompt,
        style,
        aspectRatio,
        imageUrl: result.imageUrl,
        model: result.model,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image preview */}
      {imageUrl ? (
        <div className="rounded-lg overflow-hidden border">
          <img
            src={imageUrl}
            alt={prompt || 'Image generee'}
            className="w-full h-auto object-contain max-h-[400px]"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-2" />
          <p className="text-sm">Aucune image generee</p>
        </div>
      )}

      {/* Model info */}
      {model && (
        <div className="text-xs text-muted-foreground">
          Modele utilise : <span className="font-medium">{model}</span>
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="text-sm font-medium mb-1 block">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Decrivez l'image que vous souhaitez generer..."
          className="w-full px-3 py-2 border rounded-lg bg-background text-sm min-h-[80px] resize-y"
          rows={3}
        />
      </div>

      {/* Style */}
      <div>
        <label className="text-sm font-medium mb-1 block">Style</label>
        <div className="flex gap-2 flex-wrap">
          {STYLE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={style === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStyle(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="text-sm font-medium mb-1 block">Ratio</label>
        <div className="flex gap-2 flex-wrap">
          {RATIO_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={aspectRatio === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAspectRatio(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          Enregistrer
        </Button>
        {widget && (
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={!prompt || isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Regenerer
          </Button>
        )}
      </div>
    </div>
  );
}
