import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getCoursePlanGenerationQueue, type CoursePlanGenerationJob } from '@/lib/queue/queues';
import { validateBody, generateCoursePlanSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/studios/[id]/generate/course-plan - Generate a course plan
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(generateCoursePlanSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const {
      courseTitle,
      courseDescription,
      instructions,
      duration,
      target,
      sector,
      level,
      prerequisites,
      style,
      objectives,
      sourceIds,
      language,
      preferredProvider,
    } = validation.data;

    // Create generation run
    const run = await prisma.generationRun.create({
      data: {
        studioId,
        type: 'COURSE_PLAN',
        status: 'PENDING',
        metadata: {
          courseTitle,
          duration,
          target,
          level,
          style,
        },
      },
    });

    // Add job to queue
    const queue = getCoursePlanGenerationQueue();
    const jobData: CoursePlanGenerationJob = {
      runId: run.id,
      studioId,
      sourceIds,
      config: {
        courseTitle,
        courseDescription,
        instructions,
        duration,
        target: target as CoursePlanGenerationJob['config']['target'],
        sector,
        level: level as CoursePlanGenerationJob['config']['level'],
        prerequisites,
        style,
        objectives,
        language,
        preferredProvider,
      },
    };

    const job = await queue.add('generate-course-plan', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      jobId: job.id,
      status: 'PENDING',
    });
  } catch (error) {
    logger.error('Error generating course plan', { studioId: (await params).id, error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate course plan' },
      { status: 500 }
    );
  }
}
