'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface AudioGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

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

const SPEAKER_OPTIONS = [
  { value: '1', label: '1 narrateur' },
  { value: '2', label: '2 voix (dialogue)' },
];

const TTS_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'gemini', label: 'Gemini' },
] as const;

type TtsProvider = (typeof TTS_OPTIONS)[number]['value'];

export function AudioGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: AudioGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [targetDuration, setTargetDuration] = useState('3');
  const [tone, setTone] = useState('casual');
  const [style, setStyle] = useState('discussion');
  const [speakerCount, setSpeakerCount] = useState('2');
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>('elevenlabs');
  const [ttsAvailability, setTtsAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/studios/${studioId}/tts-providers`)
      .then((res) => res.json())
      .then((data) => {
        const avail: Record<string, boolean> = {};
        for (const p of data.providers ?? []) avail[p.key] = p.available;
        setTtsAvailability(avail);
      })
      .catch(() => {});
  }, [studioId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/audio-podcast',
          title: title || 'Audio',
          inputs: {
            targetDuration,
            tone,
            style,
            speakerCount,
            ttsProvider,
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
      console.error('Error generating audio:', error);
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
            placeholder="Podcast genere"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Configuration du podcast
        </h3>

        <div className="space-y-2">
          <Label>Duree</Label>
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

        <div className="space-y-2">
          <Label>Style</Label>
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
          <Label>Voix</Label>
          <div className="flex gap-2 flex-wrap">
            {SPEAKER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={speakerCount === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSpeakerCount(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Synthese vocale</Label>
          <div className="flex gap-2 flex-wrap">
            {TTS_OPTIONS.map((opt) => {
              const available = ttsAvailability[opt.value] !== false;
              return (
                <Button
                  key={opt.value}
                  variant={ttsProvider === opt.value ? 'default' : 'outline'}
                  size="sm"
                  disabled={!available}
                  onClick={() => setTtsProvider(opt.value)}
                  className={!available ? 'opacity-50 cursor-not-allowed' : ''}
                  title={!available ? 'Cle API non configuree' : undefined}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            ElevenLabs recommande pour le francais. Mistral TTS actuellement KO.
          </p>
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
            'Generer le Podcast'
          )}
        </Button>
      </div>
    </div>
  );
}
