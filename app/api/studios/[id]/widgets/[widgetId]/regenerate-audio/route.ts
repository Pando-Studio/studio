import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { generatePodcastAudio, generateVideoNarration, type TTSProviderKey } from '@/lib/ai/tts';
import { publishStudioEvent } from '@/lib/events/studio-events';

type RouteParams = { params: Promise<{ id: string; widgetId: string }> };

// POST /api/studios/[id]/widgets/[widgetId]/regenerate-audio
// Regenerates TTS audio for an existing widget that already has a script.
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const widget = await prisma.widget.findUnique({
      where: { id: widgetId, studioId },
    });

    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const widgetData = widget.data as Record<string, unknown>;
    const body = await request.json();
    const mode = body.mode as string | undefined;
    const genConfig = (widgetData.generationConfig as Record<string, unknown>) ?? {};
    const ttsProvider = (body.ttsProvider as TTSProviderKey)
      || (genConfig.ttsProvider as TTSProviderKey)
      || 'openai';

    // Video narration mode
    if (mode === 'video-narration' || widget.type === 'VIDEO') {
      const script = widgetData.script as { slides: Array<{ id: string; narration: string; durationHint?: number; title?: string; order?: number }> } | undefined;
      if (!script?.slides?.length) {
        return NextResponse.json({ error: 'Pas de storyboard disponible. Generez d\'abord le script.' }, { status: 400 });
      }

      const result = await generateVideoNarration(script.slides, studioId, ttsProvider);

      // Update slides with audio URLs
      const updatedSlides = script.slides.map((slide) => ({
        ...slide,
        audioUrl: result.slideAudioUrls[slide.id],
      }));

      // Derive chapters
      let cumulativeTime = 0;
      const chapters = updatedSlides.map((slide) => {
        const chapter = {
          id: slide.id,
          title: slide.title || `Slide ${slide.order ?? 0}`,
          timestamp: cumulativeTime,
        };
        cumulativeTime += slide.durationHint || 15;
        return chapter;
      });

      const updatedData = {
        ...widgetData,
        script: { slides: updatedSlides },
        duration: result.totalDurationSeconds,
        transcript: result.transcript,
        chapters,
      };

      await prisma.widget.update({
        where: { id: widgetId },
        data: { data: updatedData, updatedAt: new Date() },
      });

      await publishStudioEvent(studioId, 'widget:updated', { widgetId }).catch(() => {});

      return NextResponse.json({ success: true, duration: result.totalDurationSeconds });
    }

    // Audio podcast mode (default)
    const script = widgetData.script as { segments: Array<{ id: string; speakerId: string; text: string; type: string }> } | undefined;
    if (!script?.segments?.length) {
      return NextResponse.json({ error: 'Pas de script disponible. Generez d\'abord le script.' }, { status: 400 });
    }

    const voices = widgetData.voices as Array<{ id: string; name: string; role: string }> | undefined;
    const result = await generatePodcastAudio(script, voices, studioId, ttsProvider);

    const updatedData = {
      ...widgetData,
      audioUrl: result.audioUrl,
      duration: result.durationSeconds,
      transcript: result.transcript,
    };

    await prisma.widget.update({
      where: { id: widgetId },
      data: { data: updatedData, updatedAt: new Date() },
    });

    await publishStudioEvent(studioId, 'widget:updated', { widgetId }).catch(() => {});

    return NextResponse.json({
      audioUrl: result.audioUrl,
      duration: result.durationSeconds,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Error regenerating audio', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
