'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Loader2, Presentation, Image, Cloud } from 'lucide-react';
import { useStudio } from './context/StudioContext';
import { cn } from '@/lib/utils';

interface GeneratePresentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPresentationCreated?: (presentation: { id: string; runId: string }) => void;
}

const TEXT_DENSITY_OPTIONS = [
  { value: 'minimal', label: 'Minimal', description: 'Mots-cles et phrases courtes' },
  { value: 'balanced', label: 'Equilibre', description: 'Mix de bullet points et texte' },
  { value: 'detailed', label: 'Detaille', description: 'Paragraphes explicatifs riches' },
];

const TONE_OPTIONS = [
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'pedagogique', label: 'Pedagogique' },
  { value: 'decontracte', label: 'Decontracte' },
  { value: 'inspirant', label: 'Inspirant' },
  { value: 'technique', label: 'Technique' },
];

const IMAGE_SOURCE_OPTIONS = [
  { value: 'ai', label: 'IA (Gemini)', icon: Image, description: 'Images generees par IA' },
  { value: 'unsplash', label: 'Unsplash', icon: Cloud, description: 'Photos de stock' },
];

export function GeneratePresentationModal({
  open,
  onOpenChange,
  onPresentationCreated,
}: GeneratePresentationModalProps) {
  const { studio, selectedSourceIds, refreshStudio } = useStudio();
  const [title, setTitle] = useState('');
  const [slideCount, setSlideCount] = useState(10);
  const [textDensity, setTextDensity] = useState<'minimal' | 'balanced' | 'detailed'>('balanced');
  const [tone, setTone] = useState('professionnel');
  const [imageSource, setImageSource] = useState<'ai' | 'unsplash'>('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (!studio) {
      setError('Studio non trouve');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/studios/${studio.id}/generate/presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sourceIds: Array.from(selectedSourceIds),
          slideCount,
          textDensity,
          tone,
          imageSource,
          language: 'fr',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate presentation');
      }

      onOpenChange(false);
      resetForm();

      if (onPresentationCreated) {
        onPresentationCreated({
          id: data.presentationId,
          runId: data.runId,
        });
      }

      // Refresh studio to show the new run
      refreshStudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSlideCount(10);
    setTextDensity('balanced');
    setTone('professionnel');
    setImageSource('ai');
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Presentation className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <DialogTitle>Generer une Presentation</DialogTitle>
                <DialogDescription>
                  Creez une presentation en slides a partir de vos sources.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Titre de la presentation *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Introduction a..."
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Source selection info */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                {selectedSourceIds.size > 0 ? (
                  <>
                    <span className="font-medium text-foreground">
                      {selectedSourceIds.size} source(s) selectionnee(s)
                    </span>
                    {' '}seront utilisees pour generer le contenu.
                  </>
                ) : (
                  <>
                    Aucune source selectionnee. La presentation sera generee a partir de toutes les sources du studio.
                  </>
                )}
              </p>
            </div>

            {/* Slide count */}
            <div className="grid gap-2">
              <Label htmlFor="slideCount">Nombre de slides ({slideCount})</Label>
              <input
                type="range"
                id="slideCount"
                min={5}
                max={30}
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                disabled={isLoading}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>30</span>
              </div>
            </div>

            {/* Text density */}
            <div className="grid gap-2">
              <Label>Densite de texte</Label>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_DENSITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTextDensity(option.value as 'minimal' | 'balanced' | 'detailed')}
                    disabled={isLoading}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                      textDensity === option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="grid gap-2">
              <Label htmlFor="tone">Ton</Label>
              <Select value={tone} onValueChange={setTone} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un ton" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image source */}
            <div className="grid gap-2">
              <Label>Source des images</Label>
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_SOURCE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setImageSource(option.value as 'ai' | 'unsplash')}
                      disabled={isLoading}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                        imageSource === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="text-left">
                        <span className="text-sm font-medium">{option.label}</span>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
