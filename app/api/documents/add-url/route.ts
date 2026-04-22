import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getSourceAnalysisQueue, type SourceAnalysisJob } from '@/lib/queue/queues';

function detectUrlType(url: string): 'YOUTUBE' | 'WEB' {
  const youtubePatterns = [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /youtube\.com\/embed/,
    /youtube\.com\/shorts/,
  ];
  return youtubePatterns.some((p) => p.test(url)) ? 'YOUTUBE' : 'WEB';
}

function extractYoutubeTitle(url: string): string {
  try {
    const u = new URL(url);
    const videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
    return `YouTube - ${videoId}`;
  } catch {
    return 'YouTube video';
  }
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext();
    if ('error' in authCtx) {
      return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
    }
    const { userId } = authCtx;

    const { url, title } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requise' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    // Find user's first studio (or create one if needed)
    const studio = await prisma.studio.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!studio) {
      return NextResponse.json(
        { error: 'Aucun studio trouve. Creez un studio d\'abord.' },
        { status: 400 }
      );
    }

    const type = detectUrlType(url);
    const finalTitle = title || (type === 'YOUTUBE' ? extractYoutubeTitle(url) : new URL(url).hostname);

    // Check for duplicate
    const existing = await prisma.studioSource.findFirst({
      where: { studioId: studio.id, url },
    });
    if (existing) {
      return NextResponse.json({
        source: existing,
        message: 'Cette URL existe deja dans votre bibliotheque',
      });
    }

    const source = await prisma.studioSource.create({
      data: {
        studioId: studio.id,
        type,
        title: finalTitle,
        url,
        status: 'PENDING',
        metadata: { source: type },
      },
    });

    // Enqueue BullMQ job
    try {
      const queue = getSourceAnalysisQueue();
      await queue.add(
        'analyze-source',
        {
          sourceId: source.id,
          studioId: studio.id,
          filename: finalTitle,
          url,
          type,
        } satisfies SourceAnalysisJob,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    } catch (queueError) {
      logger.warn('Failed to enqueue URL analysis job', { error: queueError instanceof Error ? queueError : String(queueError) });
    }

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    logger.error('Error adding URL source', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de l\'URL' },
      { status: 500 }
    );
  }
}
