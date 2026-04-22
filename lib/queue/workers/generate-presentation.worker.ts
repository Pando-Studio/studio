import { Worker, Job } from 'bullmq';
import { prisma, Prisma } from '@/lib/db';
import { connectionOptions } from '../connection';
import type { PresentationV2GenerationJob, PresentationV2GenerationResult } from '../queues';
import { getSlideImageGenerationQueue, type SlideImageGenerationJob } from '../queues';
import { generatePresentationV2Workflow, type DeckPlanOutput, type SlideSpec } from '../../mastra/workflows/generate-presentation.workflow';
import { renderSlideSpecToA2UI } from '../../presentations/renderers/slidespec-to-a2ui';
import { logger } from '../../monitoring/logger';
import { publishStudioEvent } from '../../events/studio-events';

const QUEUE_NAME = 'studio-presentation-v2-generation';

const PROGRESS_STEPS = {
  INITIALIZING: { progress: 5, step: 'initializing', label: 'Initialisation...' },
  GENERATING_PLAN: { progress: 10, step: 'generating_plan', label: 'Generation du plan...' },
  GENERATING_SLIDES: { progress: 50, step: 'generating_slides', label: 'Generation des slides...' },
  PERSISTING: { progress: 80, step: 'persisting', label: 'Sauvegarde des slides...' },
  QUEUEING_IMAGES: { progress: 90, step: 'queueing_images', label: 'Preparation des images...' },
  COMPLETED: { progress: 100, step: 'completed', label: 'Termine!' },
};

async function updateRunProgress(
  runId: string,
  studioId: string,
  step: typeof PROGRESS_STEPS[keyof typeof PROGRESS_STEPS],
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

/**
 * Presentation Generation v2 Worker
 *
 * Processes presentation generation jobs using the v2 pipeline:
 * 1. Execute workflow (retriever → deckPlan → slideSpecs → persist)
 * 2. Create slides in database
 * 3. Queue image generation jobs
 */
async function processJob(
  job: Job<PresentationV2GenerationJob>
): Promise<PresentationV2GenerationResult> {
  const { presentationId, versionId, studioId, runId, sourceIds, config } = job.data;

  logger.generation('Starting presentation v2 generation', { runId, studioId });

  try {
    // Step 1: Initializing
    await job.updateProgress(PROGRESS_STEPS.INITIALIZING.progress);
    await updateRunProgress(runId, studioId, PROGRESS_STEPS.INITIALIZING);

    // Update run status to RUNNING
    await prisma.generationRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });

    // Update presentation version status to GENERATING
    await prisma.presentationVersion.update({
      where: { id: versionId },
      data: { status: 'GENERATING' },
    });

    // Step 2: Generating plan
    await job.updateProgress(PROGRESS_STEPS.GENERATING_PLAN.progress);
    await updateRunProgress(runId, studioId, PROGRESS_STEPS.GENERATING_PLAN);

    // Execute the v2 workflow
    const workflowRun = generatePresentationV2Workflow.createRun();

    const result = await workflowRun.start({
      triggerData: {
        studioId,
        presentationId,
        versionId,
        title: config.title,
        description: config.description,
        sourceIds,
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
    });

    // Step 3: Generating slides
    await job.updateProgress(PROGRESS_STEPS.GENERATING_SLIDES.progress);
    await updateRunProgress(runId, studioId, PROGRESS_STEPS.GENERATING_SLIDES);

    // Get results from workflow
    const deckPlanResult = result.results?.generateDeckPlan;
    const slideSpecsResult = result.results?.generateSlideSpecs;
    const persistResult = result.results?.persistAndQueueAssets;

    if (
      !deckPlanResult ||
      deckPlanResult.status !== 'success' ||
      !slideSpecsResult ||
      slideSpecsResult.status !== 'success'
    ) {
      throw new Error('Workflow failed to generate slides');
    }

    // Extract output with proper typing
    const deckPlan = (deckPlanResult as { status: 'success'; output: DeckPlanOutput }).output;
    const slideSpecs = ((slideSpecsResult as { status: 'success'; output: { slideSpecs: SlideSpec[] } }).output?.slideSpecs) || [];
    const pendingImageJobs = ((persistResult as { status: 'success'; output: { pendingImageJobs: Array<{ slideId: string; imagePrompt: string }> } } | undefined)?.output?.pendingImageJobs) || [];

    // Step 4: Persisting slides
    await updateRunProgress(runId, studioId, PROGRESS_STEPS.PERSISTING);

    // Create slides in database
    const createdSlides = [];

    for (let i = 0; i < slideSpecs.length; i++) {
      const slideSpec = slideSpecs[i];

      // Render to A2UI format for storage
      const a2uiDocument = renderSlideSpecToA2UI(slideSpec, 'edit');

      // Extract order from slide ID (slide-1, slide-2, etc.)
      const order = parseInt(slideSpec.id.replace('slide-', ''), 10) || i + 1;

      // Find matching deck plan entry for the title
      const deckPlanSlide = deckPlan.slides?.find((s: { order: number }) => s.order === order);
      const title = deckPlanSlide?.title || `Slide ${order}`;

      // Prepare content as plain JSON object
      const slideContent = {
        spec: JSON.parse(JSON.stringify(slideSpec)),
        a2ui: JSON.parse(JSON.stringify(a2uiDocument)),
        title,
        intent: slideSpec.intent,
        layout: slideSpec.layout,
        isInteractive: slideSpec.intent === 'interactive',
        type: slideSpec.intent === 'interactive' ? 'activity' : 'text',
      };

      const slide = await prisma.slide.create({
        data: {
          presentationVersionId: versionId,
          order,
          content: slideContent,
          notes: slideSpec.speakerNotes,
        },
      });

      createdSlides.push({
        id: slide.id,
        order,
        title,
        intent: slideSpec.intent,
        layout: slideSpec.layout,
      });

      // Update progress
      await job.updateProgress(50 + Math.round(((i + 1) / slideSpecs.length) * 40));
    }

    // Step 5: Queue image generation jobs
    if (pendingImageJobs.length > 0 && config.imageSource !== 'none') {
      await updateRunProgress(runId, studioId, PROGRESS_STEPS.QUEUEING_IMAGES);
      const imageQueue = getSlideImageGenerationQueue();

      for (const imageJob of pendingImageJobs) {
        // Find the created slide by spec ID
        const createdSlide = createdSlides.find(
          (s) => s.id.includes(imageJob.slideId) || `slide-${s.order}` === imageJob.slideId
        );

        if (createdSlide) {
          const jobData: SlideImageGenerationJob = {
            slideId: createdSlide.id,
            presentationId,
            studioId,
            imagePrompt: imageJob.imagePrompt,
            source: config.imageSource as 'ai' | 'unsplash',
            position: 'hero',
          };

          await imageQueue.add('generate-slide-image', jobData, {
            jobId: `slide-image-${createdSlide.id}`,
          });
        }
      }
    }

    // Update presentation version status to READY
    await prisma.presentationVersion.update({
      where: { id: versionId },
      data: { status: 'READY' },
    });

    // Update run status to COMPLETED
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: {
          ...(await prisma.generationRun.findUnique({ where: { id: runId } }))?.metadata as object,
          deckPlanNarrative: deckPlan.narrative,
          slidesGenerated: createdSlides.length,
          pendingImages: pendingImageJobs.length,
        },
      },
    });

    await job.updateProgress(100);
    await publishStudioEvent(studioId, 'generation:complete', { runId, presentationId, versionId, type: 'PRESENTATION' }).catch(() => {});

    logger.generation('Presentation v2 generation completed', {
      runId,
      studioId,
      type: 'PRESENTATION',
    });

    return {
      success: true,
      presentationId,
      versionId,
      slidesCount: createdSlides.length,
      slides: createdSlides,
      pendingImageJobs: pendingImageJobs.length,
    };
  } catch (error) {
    logger.error('Presentation v2 generation failed', {
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

    await publishStudioEvent(studioId, 'generation:complete', { runId, presentationId, versionId, status: 'FAILED' }).catch(() => {});

    // Update presentation version status back to DRAFT
    await prisma.presentationVersion.update({
      where: { id: versionId },
      data: { status: 'DRAFT' },
    });

    return {
      success: false,
      presentationId,
      versionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Create and start the worker
export function startPresentationV2GenerationWorker() {
  const worker = new Worker<PresentationV2GenerationJob, PresentationV2GenerationResult>(
    QUEUE_NAME,
    processJob,
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  worker.on('completed', (job, result) => {
    logger.info('Presentation v2 worker job completed', { runId: job.data.runId, success: result.success });
  });

  worker.on('failed', (job, error) => {
    logger.error('Presentation v2 worker job failed', {
      runId: job?.data.runId,
      error: error instanceof Error ? error : String(error),
    });
  });

  worker.on('error', (error) => {
    logger.error('Presentation v2 worker error', { error: error instanceof Error ? error : String(error) });
  });

  logger.info('Presentation v2 generation worker started');

  return worker;
}

export default startPresentationV2GenerationWorker;
