import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getPresentationGenerationQueue } from '@/lib/queue/queues';
import type { PresentationGenerationJob } from '@/lib/queue/queues';
import { validateBody, generatePresentationSchema } from '@/lib/api/schemas';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateBody(generatePresentationSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const config = validation.data;

    // Create presentation in database
    const presentation = await prisma.presentation.create({
      data: {
        studioId,
        title: config.title,
        versions: {
          create: {
            version: 1,
            status: 'DRAFT',
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Create generation run
    const run = await prisma.generationRun.create({
      data: {
        studioId,
        type: 'SLIDES',
        status: 'PENDING',
        presentationId: presentation.id,
        metadata: {
          title: config.title,
          slideCount: config.slideCount,
          textDensity: config.textDensity,
          tone: config.tone,
          imageSource: config.imageSource,
          sourceIds: config.sourceIds,
        },
      },
    });

    // Queue the job
    const queue = getPresentationGenerationQueue();
    const jobData: PresentationGenerationJob = {
      presentationId: presentation.id,
      studioId,
      runId: run.id,
      sourceIds: config.sourceIds,
      config: {
        title: config.title,
        slideCount: config.slideCount,
        textDensity: config.textDensity,
        tone: config.tone,
        imageSource: config.imageSource,
        language: config.language,
        preferredProvider: config.preferredProvider,
      },
    };

    await queue.add('generate-presentation', jobData, {
      jobId: `presentation-${presentation.id}`,
    });

    return NextResponse.json({
      success: true,
      presentationId: presentation.id,
      runId: run.id,
      message: 'Presentation generation started',
    });
  } catch (error) {
    logger.error('Error generating presentation', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to start presentation generation' },
      { status: 500 }
    );
  }
}
