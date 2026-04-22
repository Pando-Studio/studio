import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getSourceAnalysisQueue, type SourceAnalysisJob } from '@/lib/queue/queues';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authCtx = await getAuthContext();
    if ('error' in authCtx) {
      return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
    }
    const { userId } = authCtx;

    const source = await prisma.studioSource.findUnique({
      where: { id },
      include: {
        studio: true,
        _count: { select: { chunks: true } },
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Document non trouve' },
        { status: 404 }
      );
    }

    if (source.studio.userId !== userId) {
      return NextResponse.json(
        { error: 'Acces non autorise' },
        { status: 403 }
      );
    }

    // Allow retry for ERROR, INDEXING (stuck), or INDEXED with 0 chunks
    const canRetry =
      source.status === 'ERROR' ||
      source.status === 'INDEXING' ||
      (source.status === 'INDEXED' && source._count.chunks === 0);

    if (!canRetry) {
      return NextResponse.json(
        { error: 'Le document ne peut pas etre relance (status: ' + source.status + ', chunks: ' + source._count.chunks + ')' },
        { status: 400 }
      );
    }

    // Delete existing chunks (if any) before re-processing
    await prisma.studioSourceChunk.deleteMany({
      where: { sourceId: id },
    });

    // Reset status to PENDING
    await prisma.studioSource.update({
      where: { id },
      data: { status: 'PENDING' },
    });

    // Enqueue BullMQ job
    const queue = getSourceAnalysisQueue();
    await queue.add(
      'analyze-source',
      {
        sourceId: source.id,
        studioId: source.studioId,
        filename: source.title,
        url: source.url || '',
        s3Key: source.s3Key || undefined,
        type: source.type as SourceAnalysisJob['type'],
      } satisfies SourceAnalysisJob,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );

    return NextResponse.json({
      success: true,
      status: 'PENDING',
    });
  } catch (error) {
    logger.error('Error retrying document', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la relance du document' },
      { status: 500 }
    );
  }
}
