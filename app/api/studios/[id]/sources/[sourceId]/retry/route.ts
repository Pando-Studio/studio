import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getSourceAnalysisQueue, type SourceAnalysisJob } from '@/lib/queue/queues';

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>;
}

// POST /api/studios/[id]/sources/[sourceId]/retry
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, sourceId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Verify the source belongs to this studio and is in ERROR state
    const source = await prisma.studioSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source non trouvee' }, { status: 404 });
    }

    if (source.studioId !== studioId) {
      return NextResponse.json(
        { error: 'La source n\'appartient pas a ce studio' },
        { status: 403 }
      );
    }

    if (source.status !== 'ERROR') {
      return NextResponse.json(
        { error: 'Seules les sources en erreur peuvent etre relancees' },
        { status: 400 }
      );
    }

    // Reset status to PENDING
    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { status: 'PENDING' },
    });

    // Re-enqueue the BullMQ analysis job
    try {
      const queue = getSourceAnalysisQueue();
      await queue.add(
        'analyze-source',
        {
          sourceId,
          studioId,
          filename: source.title,
          url: source.url ?? '',
          s3Key: source.s3Key ?? undefined,
          type: source.type as SourceAnalysisJob['type'],
        } satisfies SourceAnalysisJob,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    } catch (queueError: unknown) {
      logger.warn('Failed to enqueue source retry job', {
        studioId,
        sourceId,
        error: queueError instanceof Error ? queueError : String(queueError),
      });
    }

    logger.source('retry requested', { studioId, sourceId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error retrying source analysis', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Erreur lors de la relance de l\'analyse' },
      { status: 500 }
    );
  }
}
