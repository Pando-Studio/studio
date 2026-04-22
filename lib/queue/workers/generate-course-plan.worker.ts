import { Worker, Job } from 'bullmq';
import { prisma, Prisma } from '@/lib/db';
import { connectionOptions } from '../connection';
import type { CoursePlanGenerationJob, CoursePlanGenerationResult } from '../queues';
import { generateCoursePlanWorkflow } from '../../mastra/workflows/generate-course-plan.workflow';
import type { CoursePlanOutput } from '../../mastra/workflows/generate-course-plan.workflow';
import { logger } from '../../monitoring/logger';
import { publishStudioEvent } from '../../events/studio-events';

const QUEUE_NAME = 'studio-course-plan-generation';

// Progress steps
const STEPS = {
  INITIALIZING: { progress: 5, step: 'initializing', label: 'Initialisation...' },
  RETRIEVING_CONTENT: { progress: 15, step: 'retrieving', label: 'Recuperation du contenu...' },
  ANALYZING_SOURCES: { progress: 30, step: 'analyzing', label: 'Analyse des sources...' },
  GENERATING_STRUCTURE: { progress: 50, step: 'generating_structure', label: 'Generation de la structure...' },
  GENERATING_MODULES: { progress: 70, step: 'generating_modules', label: 'Generation des modules...' },
  FINALIZING: { progress: 90, step: 'finalizing', label: 'Validation et sauvegarde...' },
  COMPLETED: { progress: 100, step: 'completed', label: 'Termine!' },
};

async function updateRunProgress(
  runId: string,
  studioId: string,
  step: typeof STEPS[keyof typeof STEPS],
) {
  await prisma.generationRun.update({
    where: { id: runId },
    data: {
      metadata: {
        progress: step.progress,
        step: step.step,
        label: step.label,
      } as Prisma.InputJsonValue,
    },
  });
  await publishStudioEvent(studioId, 'generation:progress', { runId, ...step }).catch(() => {});
}

async function processJob(
  job: Job<CoursePlanGenerationJob>
): Promise<CoursePlanGenerationResult> {
  const { runId, studioId, sourceIds, config } = job.data;

  logger.generation('Starting course plan generation', { runId, studioId });

  try {
    // Step 1: Initialize
    await job.updateProgress(STEPS.INITIALIZING);
    await updateRunProgress(runId, studioId, STEPS.INITIALIZING);

    // Update run status to RUNNING
    await prisma.generationRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });

    // Step 2: Retrieving content
    await job.updateProgress(STEPS.RETRIEVING_CONTENT);
    await updateRunProgress(runId, studioId, STEPS.RETRIEVING_CONTENT);

    // Step 3: Analyzing sources
    await job.updateProgress(STEPS.ANALYZING_SOURCES);
    await updateRunProgress(runId, studioId, STEPS.ANALYZING_SOURCES);

    // Step 4: Start generating structure
    await job.updateProgress(STEPS.GENERATING_STRUCTURE);
    await updateRunProgress(runId, studioId, STEPS.GENERATING_STRUCTURE);

    // Execute the workflow
    const workflowRun = generateCoursePlanWorkflow.createRun();
    const result = await workflowRun.start({
      triggerData: {
        studioId,
        courseTitle: config.courseTitle ?? '',
        courseDescription: config.courseDescription ?? '',
        instructions: config.instructions ?? '',
        duration: config.duration ?? '5',
        target: config.target ?? 'professional',
        sector: config.sector ?? '',
        level: config.level ?? 'intermediate',
        prerequisites: config.prerequisites ?? '',
        style: config.style ?? 'conservative',
        objectives: config.objectives ?? [],
        sourceIds,
        language: config.language ?? 'fr',
        preferredProvider: config.preferredProvider,
      },
    });

    // Step 5: Generating modules
    await job.updateProgress(STEPS.GENERATING_MODULES);
    await updateRunProgress(runId, studioId, STEPS.GENERATING_MODULES);

    // Get the course plan data from the workflow result
    const coursePlanResult = result.results?.coursePlanGenerator;
    if (!coursePlanResult || coursePlanResult.status !== 'success') {
      throw new Error('Course plan generation failed');
    }
    const coursePlanData = coursePlanResult.output as CoursePlanOutput | undefined;

    if (!coursePlanData) {
      throw new Error('No course plan data generated');
    }

    // Step 6: Finalizing
    await job.updateProgress(STEPS.FINALIZING);
    await updateRunProgress(runId, studioId, STEPS.FINALIZING);

    // Create CoursePlan record in database
    const coursePlan = await prisma.coursePlan.create({
      data: {
        studioId,
        title: coursePlanData.title,
        description: coursePlanData.description,
        content: coursePlanData.content as Prisma.InputJsonValue,
        metadata: coursePlanData.metadata as Prisma.InputJsonValue,
        status: 'DRAFT',
        runId,
      },
    });

    // Update run status to COMPLETED with reference to the course plan
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: {
          coursePlanId: coursePlan.id,
          title: coursePlanData.title,
          duration: coursePlanData.metadata.duration,
          target: coursePlanData.metadata.target,
          level: coursePlanData.metadata.level,
        } as Prisma.InputJsonValue,
      },
    });

    // Step 7: Completed
    await job.updateProgress(STEPS.COMPLETED);
    await publishStudioEvent(studioId, 'generation:complete', { runId, coursePlanId: coursePlan.id, type: 'COURSE_PLAN' }).catch(() => {});

    logger.generation('Course plan generation completed', { runId, studioId });

    return {
      success: true,
      runId,
      coursePlanId: coursePlan.id,
      coursePlan: coursePlanData,
    };
  } catch (error) {
    logger.error('Course plan generation failed', {
      runId,
      studioId,
      error: error instanceof Error ? error : String(error),
    });

    // Update run status to FAILED
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        errorLog: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    await publishStudioEvent(studioId, 'generation:complete', { runId, status: 'FAILED' }).catch(() => {});

    return {
      success: false,
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Create and start the worker
export function createCoursePlanGenerationWorker() {
  const worker = new Worker<CoursePlanGenerationJob, CoursePlanGenerationResult>(
    QUEUE_NAME,
    processJob,
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  worker.on('completed', (job, result) => {
    logger.info('CoursePlan worker job completed', { runId: job.data.runId, success: result.success });
  });

  worker.on('failed', (job, error) => {
    logger.error('CoursePlan worker job failed', {
      runId: job?.data.runId,
      error: error instanceof Error ? error : String(error),
    });
  });

  worker.on('error', (error) => {
    logger.error('CoursePlan worker error', { error: error instanceof Error ? error : String(error) });
  });

  logger.info('Course plan generation worker started');

  return worker;
}

export default createCoursePlanGenerationWorker;
