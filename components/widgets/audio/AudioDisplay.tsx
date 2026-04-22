'use client';

import { useRef } from 'react';
import { Music, Clock } from 'lucide-react';
import { Card } from '@/components/ui';
import type { WidgetDisplayProps } from '../types';
import { getWidgetConfig } from '@/lib/schemas/widget-configs';

const SPEAKER_COLORS: Record<string, string> = {
  host: 'text-blue-600',
  expert: 'text-amber-600',
  narrator: 'text-gray-600',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioDisplay({ data }: WidgetDisplayProps) {
  const audio = getWidgetConfig('AUDIO', data);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasScript = audio.script?.segments && audio.script.segments.length > 0;

  return (
    <div className="space-y-4">
      {audio.title && (
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{audio.title}</h3>
        </div>
      )}

      {audio.audioUrl ? (
        <Card className="p-4">
          <audio ref={audioRef} controls className="w-full" src={`/api/media?url=${encodeURIComponent(audio.audioUrl)}`}>
            Your browser does not support the audio element.
          </audio>
          {audio.duration && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(audio.duration)}</span>
            </div>
          )}
        </Card>
      ) : hasScript ? (
        <Card className="p-4 text-center text-muted-foreground">
          <Music className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Script genere — audio en attente de generation TTS</p>
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Audio en attente de generation</p>
        </Card>
      )}

      {audio.voices && audio.voices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {audio.voices.map((v) => (
            <span
              key={v.id}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
            >
              {v.name} ({v.role})
            </span>
          ))}
        </div>
      )}

      {/* Script dialogue view (when no audio yet) */}
      {hasScript && !audio.audioUrl && (
        <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg max-h-[400px] overflow-y-auto">
          {audio.script!.segments.map((seg) => {
            const voice = audio.voices?.find((v) => v.id === seg.speakerId);
            const colorClass = SPEAKER_COLORS[voice?.role ?? 'narrator'] ?? SPEAKER_COLORS.narrator;
            return (
              <div key={seg.id} className="flex gap-2 text-sm">
                <span className={`shrink-0 font-semibold ${colorClass}`}>
                  {voice?.name ?? seg.speakerId}:
                </span>
                <span>{seg.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {audio.transcript && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Transcription
          </summary>
          <div className="mt-2 p-3 bg-muted/50 rounded-md whitespace-pre-wrap text-xs">
            {audio.transcript}
          </div>
        </details>
      )}
    </div>
  );
}
