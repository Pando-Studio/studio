'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Music, Loader2, RefreshCw, Play, User } from 'lucide-react';
import type { WidgetEditorProps } from '../types';
import type { AudioConfig } from '@/lib/schemas/widget-configs';
import { getWidgetConfig } from '@/lib/schemas/widget-configs';

const DURATION_OPTIONS = [
  { value: '3', label: '3 min' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
];

const TONE_OPTIONS = [
  { value: 'casual', label: 'Decontracte' },
  { value: 'professional', label: 'Professionnel' },
  { value: 'academic', label: 'Academique' },
];

const STYLE_OPTIONS = [
  { value: 'interview', label: 'Interview' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'lecture', label: 'Cours' },
  { value: 'debate', label: 'Debat' },
];

const TTS_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'gemini', label: 'Gemini' },
] as const;

const SPEAKER_COLORS: Record<string, string> = {
  host: 'bg-blue-100 text-blue-800 border-blue-200',
  expert: 'bg-amber-100 text-amber-800 border-amber-200',
  narrator: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function AudioEditor({ data, onSave, widget }: WidgetEditorProps) {
  const audio = getWidgetConfig('AUDIO', data);
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

  const config = audio.generationConfig ?? {
    targetDuration: '5' as const,
    tone: 'professional' as const,
    style: 'discussion' as const,
    speakerCount: '2' as const,
    ttsProvider: 'openai' as const,
  };

  const updateConfig = (updates: Partial<typeof config>) => {
    onSave({ ...data, generationConfig: { ...config, ...updates } });
  };

  const handleGenerateAudio = async () => {
    if (!widget) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/studios/${widget.studioId}/widgets/${widget.id}/regenerate-audio`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generationConfig: config, ttsProvider: config.ttsProvider }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setError(errBody.error || `Erreur ${response.status}`);
        return;
      }

      const result = await response.json();
      if (result.audioUrl) {
        onSave({ ...data, audioUrl: result.audioUrl, duration: result.duration });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={audio.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre du podcast"
        />
      </div>

      {/* Audio player if available */}
      {audio.audioUrl && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Play className="h-4 w-4" />
            Audio genere
          </div>
          <audio controls className="w-full" src={audio.audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Script display */}
      {audio.script?.segments && audio.script.segments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Script ({audio.script.segments.length} segments)</Label>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1.5 rounded-lg border p-3">
            {audio.script.segments.map((seg) => {
              const voice = audio.voices?.find((v) => v.id === seg.speakerId);
              const colorClass = SPEAKER_COLORS[voice?.role ?? 'narrator'] ?? SPEAKER_COLORS.narrator;
              return (
                <div key={seg.id} className="flex gap-2 text-sm">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
                    {voice?.name ?? seg.speakerId}
                  </span>
                  <span className="text-muted-foreground">{seg.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generation config */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Music className="h-4 w-4" />
          Configuration du podcast
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

        {/* Style */}
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Style</label>
          <div className="flex gap-1.5 flex-wrap">
            {STYLE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={config.style === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ style: opt.value as typeof config.style })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Speaker count */}
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Voix</label>
          <div className="flex gap-1.5">
            <Button
              variant={config.speakerCount === '1' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateConfig({ speakerCount: '1' })}
            >
              <User className="h-3 w-3 mr-1" />
              1 narrateur
            </Button>
            <Button
              variant={config.speakerCount === '2' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateConfig({ speakerCount: '2' })}
            >
              <User className="h-3 w-3 mr-1" />
              2 voix (dialogue)
            </Button>
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

      {/* External URL fallback */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Fournir une URL audio externe
        </summary>
        <div className="mt-2 space-y-2">
          <Input
            value={audio.audioUrl ?? ''}
            onChange={(e) => onSave({ ...data, audioUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </details>

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Generate audio button */}
      {widget && audio.script?.segments && audio.script.segments.length > 0 && (
        <Button
          onClick={handleGenerateAudio}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {audio.audioUrl ? 'Regenerer l\'audio' : 'Generer l\'audio (TTS)'}
        </Button>
      )}
    </div>
  );
}
