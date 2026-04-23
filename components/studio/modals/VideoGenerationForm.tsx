'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface VideoGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

const SLIDE_COUNT_OPTIONS = [
  { value: 5, label: '5 slides' },
  { value: 8, label: '8 slides' },
  { value: 12, label: '12 slides' },
  { value: 20, label: '20 slides' },
];

const DURATION_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '3', label: '3 min' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
];

const TONE_OPTIONS = [
  { value: 'casual', label: 'Decontracte' },
  { value: 'professional', label: 'Professionnel' },
  { value: 'academic', label: 'Academique' },
];

export function VideoGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: VideoGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const [targetDuration, setTargetDuration] = useState('3');
  const [tone, setTone] = useState('professional');
  const [includeSlideImages, setIncludeSlideImages] = useState(false);
  const [imageProvider, setImageProvider] = useState<'gemini' | 'dall-e-3'>('gemini');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/video-slideshow',
          title: title || 'Video',
          inputs: {
            slideCount,
            targetDuration,
            tone,
            includeSlideImages,
            imageProvider,
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
      console.error('Error generating video:', error);
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
            placeholder="Video generee"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Configuration
        </h3>

        <div className="space-y-2">
          <Label>Nombre de slides</Label>
          <div className="flex gap-2 flex-wrap">
            {SLIDE_COUNT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={slideCount === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSlideCount(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Duree cible</Label>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={targetDuration === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTargetDuration(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ton</Label>
          <div className="flex gap-2 flex-wrap">
            {TONE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={tone === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTone(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Images des slides
        </h3>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant={!includeSlideImages ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIncludeSlideImages(false)}
            >
              Sans images
            </Button>
            <Button
              variant={includeSlideImages ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIncludeSlideImages(true)}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1" />
              Avec images IA
            </Button>
          </div>

          {includeSlideImages && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <Label>Provider d&apos;images</Label>
              <div className="flex gap-2">
                <Button
                  variant={imageProvider === 'gemini' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageProvider('gemini')}
                >
                  Gemini 3
                </Button>
                <Button
                  variant={imageProvider === 'dall-e-3' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageProvider('dall-e-3')}
                >
                  DALL-E 3
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Necessite une cle API {imageProvider === 'gemini' ? 'Google' : 'OpenAI'}. Genere une image par slide (~{slideCount} images).
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Annuler
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generation en cours...
            </>
          ) : (
            'Generer la Video'
          )}
        </Button>
      </div>
    </div>
  );
}
