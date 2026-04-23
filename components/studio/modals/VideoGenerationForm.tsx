'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2, Image as ImageIcon, AlertTriangle, Film, Presentation } from 'lucide-react';

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

const CINEMATIC_PROVIDERS = [
  { value: 'kling', label: 'Kling 3.0', costPerSec: 0.075, description: 'Meilleur rapport qualite/prix' },
  { value: 'runway', label: 'Runway Gen-4', costPerSec: 0.05, description: 'Le moins cher' },
  { value: 'sora', label: 'Sora 2', costPerSec: 0.10, description: 'Meilleure qualite de mouvement' },
  { value: 'veo', label: 'Veo 3.1', costPerSec: 0.50, description: 'Integration Google Cloud' },
] as const;

function estimateCinematicCost(durationMin: string, costPerSec: number): string {
  const seconds = parseInt(durationMin) * 60;
  const cost = seconds * costPerSec;
  return cost.toFixed(2);
}

export function VideoGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: VideoGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'slideshow' | 'cinematic'>('slideshow');

  // Slideshow options
  const [slideCount, setSlideCount] = useState(8);
  const [targetDuration, setTargetDuration] = useState('3');
  const [tone, setTone] = useState('professional');
  const [includeSlideImages, setIncludeSlideImages] = useState(false);
  const [imageProvider, setImageProvider] = useState<'gemini' | 'dall-e-3'>('gemini');

  // Cinematic options
  const [cinematicProvider, setCinematicProvider] = useState<string>('kling');

  const selectedCinematicProvider = CINEMATIC_PROVIDERS.find(p => p.value === cinematicProvider) ?? CINEMATIC_PROVIDERS[0];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const inputs = mode === 'slideshow'
        ? {
            slideCount,
            targetDuration,
            tone,
            includeSlideImages,
            imageProvider,
            mode: 'slideshow',
          }
        : {
            targetDuration,
            tone,
            mode: 'cinematic',
            cinematicProvider,
          };

      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/video-slideshow',
          title: title || 'Video',
          inputs,
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
      {/* Title */}
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

      {/* Mode selector */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Mode de video
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('slideshow')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              mode === 'slideshow'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Presentation className="h-4 w-4" />
              <span className="font-medium text-sm">Slideshow</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Slides + narration TTS. Rapide et gratuit.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('cinematic')}
            className={`p-4 rounded-lg border-2 text-left transition-all relative ${
              mode === 'cinematic'
                ? 'border-orange-400 bg-orange-50'
                : 'border-border hover:border-orange-300'
            }`}
          >
            <span className="absolute -top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
              Experimental
            </span>
            <div className="flex items-center gap-2 mb-1">
              <Film className="h-4 w-4" />
              <span className="font-medium text-sm">Cinematique</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Clips IA generes + narration. Style documentaire.
            </p>
          </button>
        </div>
      </div>

      {/* Shared options */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Configuration
        </h3>

        {mode === 'slideshow' && (
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
        )}

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

      {/* Slideshow-specific: image options */}
      {mode === 'slideshow' && (
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
      )}

      {/* Cinematic-specific: provider + cost warning */}
      {mode === 'cinematic' && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Provider video IA
          </h3>

          <div className="space-y-2">
            {CINEMATIC_PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setCinematicProvider(p.value)}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  cinematicProvider === p.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div>
                  <span className="font-medium text-sm">{p.label}</span>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  ${p.costPerSec}/s
                </span>
              </button>
            ))}
          </div>

          {/* Cost warning */}
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-800">
                  Mode cinematique — cout eleve
                </p>
                <p className="text-xs text-orange-700">
                  Estimation pour {targetDuration} min avec {selectedCinematicProvider.label} :&nbsp;
                  <span className="font-bold">
                    ~${estimateCinematicCost(targetDuration, selectedCinematicProvider.costPerSec)}
                  </span>
                </p>
                <p className="text-xs text-orange-600">
                  Chaque section du contenu genere un clip video IA de 5-10s. Le resultat est un style documentaire avec des visuels generes par IA + narration.
                  Necessite une cle API {selectedCinematicProvider.label}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
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
          ) : mode === 'cinematic' ? (
            <>
              <Film className="h-4 w-4 mr-1" />
              Generer (~${estimateCinematicCost(targetDuration, selectedCinematicProvider.costPerSec)})
            </>
          ) : (
            'Generer la Video'
          )}
        </Button>
      </div>
    </div>
  );
}
