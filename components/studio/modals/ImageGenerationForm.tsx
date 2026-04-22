'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface ImageGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

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

export function ImageGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: ImageGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photo');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/image-generation',
          title: title || 'Image generee',
          inputs: {
            prompt: prompt.trim(),
            style,
            aspectRatio,
          },
          sourceIds: Array.from(selectedSourceIds),
          language: 'fr',
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la generation');
      }

      onGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Informations
        </h3>

        <div className="space-y-2">
          <Label htmlFor="title">Titre (optionnel)</Label>
          <Input
            id="title"
            placeholder="Image generee"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Description de l&apos;image
        </h3>

        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt *</Label>
          <textarea
            id="prompt"
            className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Decrivez l'image que vous souhaitez generer en detail..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Style visuel</Label>
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

        <div className="space-y-2">
          <Label>Ratio d&apos;aspect</Label>
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
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Annuler
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generation en cours...
            </>
          ) : (
            "Generer l'Image"
          )}
        </Button>
      </div>
    </div>
  );
}
