import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getDeepResearchQueue, type DeepResearchJob } from '@/lib/queue/queues';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List deep research runs for a studio
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const runs = await prisma.deepResearchRun.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ runs });
  } catch (error: unknown) {
    logger.error('Error fetching deep research runs', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des recherches' },
      { status: 500 }
    );
  }
}

// POST - Launch a new deep research run
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body: unknown = await request.json();

    // Validate body
    const parsed = body as {
      query?: string;
      language?: string;
      depth?: string;
    };

    if (!parsed.query || typeof parsed.query !== 'string' || parsed.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le champ "query" est requis' },
        { status: 400 }
      );
    }

    const query = parsed.query.trim();
    const language: 'fr' | 'en' =
      parsed.language === 'en' ? 'en' : 'fr';
    const depth: 'standard' | 'deep' =
      parsed.depth === 'deep' ? 'deep' : 'standard';

    // Create the run record
    const run = await prisma.deepResearchRun.create({
      data: {
        studioId,
        query,
        status: 'pending',
        metadata: { language, depth },
      },
    });

    // Enqueue the BullMQ job
    try {
      const queue = getDeepResearchQueue();
      await queue.add(
        'deep-research',
        {
          runId: run.id,
          studioId,
          query,
          language,
          depth,
        } satisfies DeepResearchJob,
        {
          attempts: 1, // Deep research is expensive — no auto-retry
          removeOnComplete: 100,
          removeOnFail: 100,
        }
      );
    } catch (queueError: unknown) {
      logger.warn('Failed to enqueue deep research job', {
        studioId,
        error: queueError instanceof Error ? queueError : String(queueError),
      });
      // Mark as failed if we can't even enqueue
      await prisma.deepResearchRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          metadata: { error: 'Failed to enqueue job' },
        },
      });
      return NextResponse.json(
        { error: 'Impossible de lancer la recherche' },
        { status: 500 }
      );
    }

    return NextResponse.json({ runId: run.id }, { status: 201 });
  } catch (error: unknown) {
    logger.error('Error launching deep research', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Erreur lors du lancement de la recherche' },
      { status: 500 }
    );
  }
}
