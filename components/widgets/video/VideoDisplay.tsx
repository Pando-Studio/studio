'use client';

import { useRef } from 'react';
import { Video, Clock, Layout, FileText, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui';
import type { WidgetDisplayProps } from '../types';
import { getWidgetConfig } from '@/lib/schemas/widget-configs';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const LAYOUT_ICONS: Record<string, typeof Layout> = {
  title: Layout,
  content: FileText,
  bullets: FileText,
  comparison: Layout,
  quote: FileText,
  image: ImageIcon,
};

export function VideoDisplay({ data }: WidgetDisplayProps) {
  const video = getWidgetConfig('VIDEO', data);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasScript = video.script?.slides && video.script.slides.length > 0;

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  return (
    <div className="space-y-4">
      {video.title && (
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{video.title}</h3>
        </div>
      )}

      {video.videoUrl ? (
        <Card className="overflow-hidden">
          <video
            ref={videoRef}
            controls
            className="w-full"
            src={video.videoUrl}
            poster={video.thumbnailUrl}
          >
            Your browser does not support the video element.
          </video>
        </Card>
      ) : hasScript ? (
        <Card className="p-4 text-center text-muted-foreground">
          <Video className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Storyboard genere — video en attente d'assemblage</p>
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Video en attente de generation</p>
        </Card>
      )}

      {video.duration && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimestamp(video.duration)}</span>
        </div>
      )}

      {/* Storyboard view (when no video yet) */}
      {hasScript && !video.videoUrl && (
        <div className="space-y-2">
          {video.script!.slides.map((slide, i) => {
            const LayoutIconComp = LAYOUT_ICONS[slide.layout] ?? Layout;
            return (
              <div key={slide.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                    {i + 1}
                  </span>
                  <LayoutIconComp className="h-3.5 w-3.5 text-muted-foreground" />
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
                {slide.content && (
                  <p className="text-xs text-muted-foreground">{slide.content}</p>
                )}
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  {slide.narration}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Chapters (clickable when video exists) */}
      {video.chapters && video.chapters.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Chapitres</p>
          {video.chapters.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => video.videoUrl && seekTo(ch.timestamp)}
              className={`flex items-center gap-2 text-sm w-full text-left ${
                video.videoUrl
                  ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                  : 'text-muted-foreground cursor-default'
              }`}
            >
              <span className="font-mono text-xs">{formatTimestamp(ch.timestamp)}</span>
              <span>{ch.title}</span>
            </button>
          ))}
        </div>
      )}

      {video.transcript && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Transcription
          </summary>
          <div className="mt-2 p-3 bg-muted/50 rounded-md whitespace-pre-wrap text-xs">
            {video.transcript}
          </div>
        </details>
      )}
    </div>
  );
}
