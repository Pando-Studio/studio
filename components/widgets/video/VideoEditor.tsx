'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Video, Loader2, RefreshCw, Layout, FileText, Image as ImageIcon } from 'lucide-react';
import type { WidgetEditorProps } from '../types';
import { getWidgetConfig } from '@/lib/schemas/widget-configs';

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

const TTS_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'gemini', label: 'Gemini' },
] as const;

const LAYOUT_ICONS: Record<string, typeof Layout> = {
  title: Layout,
  content: FileText,
  bullets: FileText,
  comparison: Layout,
  quote: FileText,
  image: ImageIcon,
};

export function VideoEditor({ data, onSave, widget }: WidgetEditorProps) {
  const video = getWidgetConfig('VIDEO', data);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsAvailability, setTtsAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!widget?.studioId) return;
    fetch(`/api/studios/${widget.studioId}/tts-providers`)
      .then((res) => res.json())
      .then((data) => {
        const avail: Record<string, boolean> = {};
        for (const p of data.providers ?? []) {
          avail[p.key] = p.available;
        }
        setTtsAvailability(avail);
      })
      .catch(() => {});
  }, [widget?.studioId]);

  const config = video.generationConfig ?? {
    mode: 'slideshow' as const,
    slideCount: 8,
    targetDuration: '3' as const,
    tone: 'professional' as const,
    ttsProvider: 'openai' as const,
    includeSubtitles: true,
    includeSlideImages: false,
    imageProvider: 'gemini' as const,
  };

  const updateConfig = (updates: Partial<typeof config>) => {
    onSave({ ...data, generationConfig: { ...config, ...updates } });
  };

  const handleGenerateNarration = async () => {
    if (!widget) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/studios/${widget.studioId}/widgets/${widget.id}/regenerate-audio`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'video-narration', ttsProvider: config.ttsProvider }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setError(errBody.error || `Erreur ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const hasScript = video.script?.slides && video.script.slides.length > 0;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={video.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre de la video"
        />
      </div>

      {/* Video player if available */}
      {video.videoUrl && (
        <div className="rounded-lg border overflow-hidden">
          <video
            controls
            className="w-full"
            src={video.videoUrl}
            poster={video.thumbnailUrl}
          >
            Your browser does not support the video element.
          </video>
        </div>
      )}

      {/* Storyboard display */}
      {hasScript && (
        <div className="space-y-2">
          <Label>Storyboard ({video.script!.slides.length} slides)</Label>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {video.script!.slides.map((slide, i) => {
              const LayoutIcon = LAYOUT_ICONS[slide.layout] ?? Layout;
              return (
                <div key={slide.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                    <LayoutIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{slide.layout}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ~{slide.durationHint}s
                    </span>
                  </div>
                  {slide.title && (
                    <p className="text-sm font-medium">{slide.title}</p>
                  )}
                  {slide.bullets && slide.bullets.length > 0 && (
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {slide.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {slide.narration && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                      {slide.narration}
                    </p>
                  )}
                  {slide.audioUrl && (
                    <audio controls className="w-full h-8" src={slide.audioUrl} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generation config */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Video className="h-4 w-4" />
          Configuration video
        </div>

        {/* Slide count */}
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Nombre de slides</label>
          <div className="flex gap-1.5 flex-wrap">
            {SLIDE_COUNT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={config.slideCount === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ slideCount: opt.value })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Duree</label>
          <div className="flex gap-1.5 flex-wrap">
            {DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={config.targetDuration === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ targetDuration: opt.value as typeof config.targetDuration })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Ton</label>
          <div className="flex gap-1.5 flex-wrap">
            {TONE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={config.tone === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ tone: opt.value as typeof config.tone })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* TTS Provider */}
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Synthese vocale</label>
          <div className="flex gap-1.5 flex-wrap">
            {TTS_OPTIONS.map((opt) => {
              const available = ttsAvailability[opt.value] !== false;
              return (
                <Button
                  key={opt.value}
                  variant={config.ttsProvider === opt.value ? 'default' : 'outline'}
                  size="sm"
                  disabled={!available}
                  onClick={() => updateConfig({ ttsProvider: opt.value })}
                  className={!available ? 'opacity-50 cursor-not-allowed' : ''}
                  title={!available ? 'Cle API non configuree' : undefined}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide images */}
      <div className="space-y-3 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Images des slides</span>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={!config.includeSlideImages ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateConfig({ includeSlideImages: false })}
          >
            Sans images
          </Button>
          <Button
            variant={config.includeSlideImages ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateConfig({ includeSlideImages: true })}
          >
            Avec images IA
          </Button>
        </div>
        {config.includeSlideImages && (
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-foreground">Provider</label>
            <div className="flex gap-1.5">
              <Button
                variant={config.imageProvider === 'gemini' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ imageProvider: 'gemini' })}
              >
                Gemini 3
              </Button>
              <Button
                variant={config.imageProvider === 'dall-e-3' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ imageProvider: 'dall-e-3' })}
              >
                DALL-E 3
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Necessite une cle API {config.imageProvider === 'gemini' ? 'Google' : 'OpenAI'}. Cout supplementaire par image.
            </p>
          </div>
        )}
      </div>

      {/* External URL fallback */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Fournir une URL video externe
        </summary>
        <div className="mt-2 space-y-2">
          <Input
            value={video.videoUrl ?? ''}
            onChange={(e) => onSave({ ...data, videoUrl: e.target.value })}
            placeholder="URL video (https://...)"
          />
          <Input
            value={video.thumbnailUrl ?? ''}
            onChange={(e) => onSave({ ...data, thumbnailUrl: e.target.value })}
            placeholder="URL miniature (https://...)"
          />
        </div>
      </details>

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Generate narration button */}
      {widget && hasScript && (
        <Button
          onClick={handleGenerateNarration}
          disabled={isGenerating}
          variant="outline"
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Generer les narrations (TTS)
        </Button>
      )}
    </div>
  );
}
