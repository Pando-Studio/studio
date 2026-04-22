import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getPresentationV2GenerationQueue } from '@/lib/queue/queues';
import type { PresentationV2GenerationJob } from '@/lib/queue/queues';

/**
 * Generate Presentation v2 API Route
 *
 * POST /api/studios/[id]/presentations/generate-v2
 *
 * Creates a new presentation using the v2 pipeline:
 * - Single LLM call for deck plan
 * - Parallel slide generation
 * - Async image generation jobs
 */

// Request body schema
const GeneratePresentationV2Schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  sourceIds: z.array(z.string()).default([]),
  slideCount: z.number().min(3).max(50).default(10),
  textDensity: z.enum(['minimal', 'balanced', 'detailed']).default('balanced'),
  tone: z.enum(['formel', 'professionnel', 'decontracte', 'pedagogique']).default('professionnel'),
  includeInteractiveWidgets: z.boolean().default(true),
  imageSource: z.enum(['none', 'ai', 'unsplash']).default('ai'),
  targetAudience: z.string().optional(),
  duration: z.number().min(5).max(120).optional(),
  learningObjectives: z.array(z.string()).optional(),
  language: z.string().default('fr'),
  preferredProvider: z.string().optional(),
});

export type GeneratePresentationV2Request = z.infer<typeof GeneratePresentationV2Schema>;

export interface GeneratePresentationV2Response {
  success: boolean;
  presentationId: string;
  versionId: string;
  runId: string;
  message: string;
}

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
    const validationResult = GeneratePresentationV2Schema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const config = validationResult.data;

    // Validate slide count limit
    if (config.slideCount > 50) {
      return NextResponse.json(
        { error: 'Slide count exceeds maximum of 50 for v1.0' },
        { status: 400 }
      );
    }

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

    const versionId = presentation.versions[0].id;

    // Create generation run with DECK_PLAN type
    const run = await prisma.generationRun.create({
      data: {
        studioId,
        type: 'DECK_PLAN',
        status: 'PENDING',
        presentationId: presentation.id,
        metadata: {
          title: config.title,
          description: config.description,
          slideCount: config.slideCount,
          textDensity: config.textDensity,
          tone: config.tone,
          includeInteractiveWidgets: config.includeInteractiveWidgets,
          imageSource: config.imageSource,
          targetAudience: config.targetAudience,
          duration: config.duration,
          learningObjectives: config.learningObjectives,
          sourceIds: config.sourceIds,
          version: 'v2',
        },
      },
    });

    // Queue the job
    const queue = getPresentationV2GenerationQueue();
    const jobData: PresentationV2GenerationJob = {
      presentationId: presentation.id,
      versionId,
      studioId,
      runId: run.id,
      sourceIds: config.sourceIds,
      config: {
        title: config.title,
        description: config.description,
        slideCount: config.slideCount,
        textDensity: config.textDensity,
        tone: config.tone,
        includeInteractiveWidgets: config.includeInteractiveWidgets,
        imageSource: config.imageSource,
        targetAudience: config.targetAudience,
        duration: config.duration,
        learningObjectives: config.learningObjectives,
        language: config.language,
        preferredProvider: config.preferredProvider,
      },
    };

    await queue.add('generate-presentation-v2', jobData, {
      jobId: `presentation-v2-${presentation.id}`,
    });

    // Update version status to GENERATING
    await prisma.presentationVersion.update({
      where: { id: versionId },
      data: { status: 'GENERATING' },
    });

    const response: GeneratePresentationV2Response = {
      success: true,
      presentationId: presentation.id,
      versionId,
      runId: run.id,
      message: 'Presentation generation started (v2 pipeline)',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error generating presentation v2', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to start presentation generation' },
      { status: 500 }
    );
  }
}
