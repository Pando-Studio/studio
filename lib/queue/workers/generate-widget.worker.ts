import { Worker, Job } from 'bullmq';
import { prisma, type Prisma } from '@/lib/db';
import { connectionOptions } from '../connection';
import type { WidgetGenerationJob, WidgetGenerationResult } from '../queues';
import { generateWidgetWorkflow } from '../../mastra/workflows/generate-widget.workflow';
import { templateRegistry } from '../../widget-templates/registry';
import { logger } from '../../monitoring/logger';
import { publishStudioEvent } from '../../events/studio-events';

const QUEUE_NAME = 'studio-widget-generation';

const STEPS = {
  INITIALIZING: { progress: 5, step: 'initializing', label: 'Chargement du template...' },
  RETRIEVING: { progress: 20, step: 'retrieving', label: 'Recherche dans les sources...' },
  GENERATING: { progress: 60, step: 'generating', label: 'Generation du contenu...' },
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
  job: Job<WidgetGenerationJob>
): Promise<WidgetGenerationResult> {
  const { runId, widgetId, studioId, templateId, title, description, inputs, sourceIds, language, preferredProvider } = job.data;
  const jobStartTime = Date.now();

  logger.generation('Starting widget generation', { runId, widgetId, studioId, type: templateId });

  try {
    // Step 1: Initializing — template loading + validation
    await job.updateProgress(STEPS.INITIALIZING);
    await updateRunProgress(runId, studioId, STEPS.INITIALIZING);

    // Update run status to RUNNING
    await prisma.generationRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });

    // Check widget type for specialized generation paths
    const template = templateRegistry.get(templateId);
    const isImageGeneration = template?.widgetType === 'IMAGE';
    const isAudioGeneration = template?.widgetType === 'AUDIO';
    const isVideoGeneration = template?.widgetType === 'VIDEO';

    // Step 2: Retrieving — RAG retrieval from sources
    await job.updateProgress(STEPS.RETRIEVING);
    await updateRunProgress(runId, studioId, STEPS.RETRIEVING);

    let generatedData: Record<string, unknown>;

    if (isImageGeneration) {
      // Image generation - use dedicated image generation module
      const { generateImage } = await import('../../ai/image-generation');

      const prompt = (inputs.prompt as string) || title;
      const style = (inputs.style as string) || 'photo';
      const aspectRatio = (inputs.aspectRatio as string) || '16:9';
      const preferredModel = inputs.preferredModel as string | undefined;

      // Step 3: Generating — LLM generation
      await job.updateProgress(STEPS.GENERATING);
      await updateRunProgress(runId, studioId, STEPS.GENERATING);

      // Build detailed prompt with style
      const styledPrompt = `${prompt}. Style: ${style}. Aspect ratio: ${aspectRatio}.`;

      const imageResult = await generateImage(styledPrompt, studioId, preferredModel || preferredProvider);

      generatedData = {
        imageUrl: imageResult.imageUrl,
        prompt,
        model: imageResult.model,
        style,
        aspectRatio,
      };
    } else {
      // Standard widget generation via Mastra workflow (includes AUDIO script + VIDEO storyboard)
      // Step 3: Generating — LLM generation
      await job.updateProgress(STEPS.GENERATING);
      await updateRunProgress(runId, studioId, STEPS.GENERATING);

      logger.generation('Running Mastra workflow', { runId, type: templateId });
      const workflowRun = generateWidgetWorkflow.createRun();
      const result = await workflowRun.start({
        triggerData: {
          studioId,
          templateId,
          title,
          description,
          inputs,
          sourceIds,
          language,
          preferredProvider,
        },
      });

      const generatorResult = result.results?.generator;
      if (!generatorResult || generatorResult.status !== 'success') {
        const allResults = result.results ?? {};
        const stepSummary = Object.entries(allResults).map(
          ([k, v]) => `${k}=${(v as { status?: string })?.status ?? 'unknown'}`
        ).join(', ');
        logger.error('Widget workflow failed', { runId, error: `steps: ${stepSummary}` });
        throw new Error(`Widget generation failed (steps: ${stepSummary})`);
      }

      generatedData = generatorResult.output as Record<string, unknown>;
      if (!generatedData) {
        throw new Error('No widget data generated');
      }

      // Post-generation: TTS for AUDIO widgets
      if (isAudioGeneration && generatedData.script) {
        try {
          const { generatePodcastAudio } = await import('../../ai/tts');
          const script = generatedData.script as { segments: Array<{ id: string; speakerId: string; text: string; type: string }> };
          const voices = generatedData.voices as Array<{ id: string; name: string; role: string }> | undefined;

          const ttsProvider = ((inputs as Record<string, unknown>).ttsProvider as string) || 'openai';
          logger.generation(`Generating podcast audio (TTS: ${ttsProvider})`, { runId, segmentCount: script.segments.length });

          const audioResult = await generatePodcastAudio(script, voices, studioId, ttsProvider as import('../../ai/tts').TTSProviderKey);
          generatedData.audioUrl = audioResult.audioUrl;
          generatedData.duration = audioResult.durationSeconds;
          generatedData.transcript = audioResult.transcript;

          logger.generation('Podcast audio generated', { runId, duration: audioResult.durationSeconds });
        } catch (ttsError) {
          // TTS failure is non-fatal: script is still saved, user can retry TTS later
          logger.warn('TTS generation failed, script saved without audio', {
            runId,
            error: ttsError instanceof Error ? ttsError.message : String(ttsError),
          });
        }
      }

      // Post-generation: TTS narration for VIDEO widgets
      if (isVideoGeneration && generatedData.script) {
        try {
          const { generateVideoNarration } = await import('../../ai/tts');
          const script = generatedData.script as { slides: Array<{ id: string; narration: string }> };

          const videoTtsProvider = ((inputs as Record<string, unknown>).ttsProvider as string) || 'openai';
          logger.generation(`Generating video narration (TTS: ${videoTtsProvider})`, { runId, slideCount: script.slides.length });

          const narrationResult = await generateVideoNarration(script.slides, studioId, videoTtsProvider as import('../../ai/tts').TTSProviderKey);

          // Attach audio URLs to each slide
          const updatedSlides = script.slides.map((slide) => ({
            ...slide,
            audioUrl: narrationResult.slideAudioUrls[slide.id],
          }));
          generatedData.script = { slides: updatedSlides };
          generatedData.duration = narrationResult.totalDurationSeconds;
          generatedData.transcript = narrationResult.transcript;

          // Derive chapters from slides with cumulative timestamps
          let cumulativeTime = 0;
          const chapters = updatedSlides.map((slide) => {
            const chapter = {
              id: slide.id,
              title: (slide as Record<string, unknown>).title as string || `Slide ${(slide as Record<string, unknown>).order}`,
              timestamp: cumulativeTime,
            };
            cumulativeTime += ((slide as Record<string, unknown>).durationHint as number) || 15;
            return chapter;
          });
          generatedData.chapters = chapters;

          logger.generation('Video narration generated', { runId, duration: narrationResult.totalDurationSeconds });
        } catch (ttsError) {
          // TTS failure is non-fatal: storyboard is still saved
          logger.warn('Video narration TTS failed, storyboard saved without audio', {
            runId,
            error: ttsError instanceof Error ? ttsError.message : String(ttsError),
          });
        }
      }
    }

    // Step 4b: Generate slide images (optional, when includeSlideImages is true)
    if (isVideoGeneration && generatedData.script) {
      const genConfig = (inputs as Record<string, unknown>);
      const includeSlideImages = genConfig.includeSlideImages === true;
      if (includeSlideImages) {
        const slides = (generatedData.script as { slides: Array<Record<string, unknown>> }).slides;
        const slidesWithPrompt = slides.filter((s) => s.imagePrompt);
        if (slidesWithPrompt.length > 0) {
          try {
            logger.generation('Generating slide images', { runId, count: slidesWithPrompt.length });
            await updateRunProgress(runId, studioId, {
              step: 'images',
              label: `Generation des images (0/${slidesWithPrompt.length})...`,
              progress: 72,
            });

            const { generateImage } = await import('../../ai/image-generation');
            const imageProvider = (genConfig.imageProvider as string) || 'gemini';
            const preferredModel = imageProvider === 'dall-e-3' ? 'dall-e-3' : undefined;

            for (let i = 0; i < slides.length; i++) {
              const slide = slides[i];
              if (!slide.imagePrompt) continue;

              try {
                const imageResult = await generateImage(
                  `${slide.imagePrompt}. Style: cinematic, high quality, 16:9 aspect ratio, suitable as presentation slide background.`,
                  studioId,
                  preferredModel,
                );
                slide.imageUrl = imageResult.imageUrl;
                // Switch layout to 'image' to use the ImageSlide component
                slide.layout = 'image';

                await updateRunProgress(runId, studioId, {
                  step: 'images',
                  label: `Generation des images (${i + 1}/${slidesWithPrompt.length})...`,
                  progress: 72 + Math.round((i / slidesWithPrompt.length) * 5),
                });

                logger.info('Slide image generated', { runId, slideId: slide.id, model: imageResult.model });
              } catch (imgError) {
                // Image failure is non-fatal per slide
                logger.warn('Slide image generation failed', {
                  runId,
                  slideId: slide.id as string,
                  error: imgError instanceof Error ? imgError.message : String(imgError),
                });
              }
            }

            generatedData.script = { slides };
            logger.generation('Slide images generated', { runId, total: slidesWithPrompt.length });
          } catch (imageError) {
            logger.warn('Slide image generation step failed', {
              runId,
              error: imageError instanceof Error ? imageError.message : String(imageError),
            });
          }
        }
      }
    }

    // Step 5: Video assembly (slideshow mode) — render slides + audio into MP4
    const assemblyCheck = {
      isVideoGeneration,
      hasScript: !!generatedData.script,
      slideCount: (generatedData.script as { slides?: unknown[] })?.slides?.length,
    };
    logger.info('Video assembly check', { runId, ...assemblyCheck });
    // Persist check to DB for debugging (will be overwritten by final metadata)
    await prisma.generationRun.update({
      where: { id: runId },
      data: { errorLog: `assembly_check: ${JSON.stringify(assemblyCheck)}` },
    });
    const videoMode = (inputs as Record<string, unknown>).mode as string || 'slideshow';
    if (isVideoGeneration && generatedData.script) {
      const slides = (generatedData.script as { slides: Array<Record<string, unknown>> }).slides;
      const hasAudio = slides.some((s) => s.audioUrl);
      logger.info('Video assembly check', { runId, hasAudio, videoMode, slidesWithAudio: slides.filter(s => s.audioUrl).length });

      if (videoMode === 'cinematic') {
        // CINEMATIC MODE: generate AI video clips + assemble with ffmpeg
        try {
          const cinematicProviderName = (inputs as Record<string, unknown>).cinematicProvider as string || 'kling';
          logger.generation('Cinematic video generation', { runId, provider: cinematicProviderName, sections: slides.length });
          await updateRunProgress(runId, studioId, {
            step: 'cinematic',
            label: `Generation cinematique (0/${slides.length})...`,
            progress: 78,
          });

          const { getCinematicProvider } = await import('../../video/providers');
          const { renderCinematicVideo } = await import('../../video/cinematic-render');
          const { uploadToS3, generateS3Key } = await import('../../s3');

          const provider = getCinematicProvider(cinematicProviderName);

          // Convert slides to cinematic sections
          const sections = slides.map((s) => ({
            id: s.id as string,
            title: (s.title as string) || '',
            visualPrompt: (s.imagePrompt as string) || (s.narration as string) || (s.title as string) || '',
            narration: (s.narration as string) || '',
            durationHint: (s.durationHint as number) || 8,
            audioUrl: s.audioUrl as string | undefined,
          }));

          const renderResult = await renderCinematicVideo(
            sections,
            provider,
            (current, total) => {
              updateRunProgress(runId, studioId, {
                step: 'cinematic',
                label: `Generation cinematique (${current}/${total})...`,
                progress: 78 + Math.round((current / total) * 15),
              });
            },
          );

          // Upload video
          const videoKey = generateS3Key(`cinematic-${Date.now()}.mp4`, studioId);
          const videoUpload = await uploadToS3(renderResult.videoBuffer, videoKey, 'video/mp4');
          generatedData.videoUrl = videoUpload.url;
          generatedData.duration = Math.round(renderResult.durationSeconds);

          logger.generation('Cinematic video assembled', {
            runId,
            duration: renderResult.durationSeconds,
            videoSize: renderResult.videoBuffer.length,
            provider: cinematicProviderName,
          });
        } catch (renderError) {
          await prisma.generationRun.update({
            where: { id: runId },
            data: { errorLog: `Cinematic assembly failed: ${renderError instanceof Error ? renderError.message : String(renderError)}` },
          });
          logger.warn('Cinematic video assembly failed', {
            runId,
            error: renderError instanceof Error ? renderError.message : String(renderError),
          });
        }
      } else if (hasAudio) {
        // SLIDESHOW MODE: render slides + audio into MP4 with Remotion
        try {
          logger.generation('Assembling slideshow video with Remotion', { runId, slideCount: slides.length });
          await updateRunProgress(runId, studioId, {
            step: 'assembling',
            label: 'Assemblage de la video...',
            progress: 80,
          });

          const { renderSlideshowVideo } = await import('../../video/render');
          const { uploadToS3, generateS3Key } = await import('../../s3');

          const renderResult = await renderSlideshowVideo(
            slides as unknown as Parameters<typeof renderSlideshowVideo>[0],
          );

          // Upload video
          const videoKey = generateS3Key(`video-${Date.now()}.mp4`, studioId);
          const videoUpload = await uploadToS3(renderResult.videoBuffer, videoKey, 'video/mp4');
          generatedData.videoUrl = videoUpload.url;

          // Upload thumbnail
          const thumbKey = generateS3Key(`thumb-${Date.now()}.jpg`, studioId);
          const thumbUpload = await uploadToS3(renderResult.thumbnailBuffer, thumbKey, 'image/jpeg');
          generatedData.thumbnailUrl = thumbUpload.url;

          // Update duration with exact render duration
          generatedData.duration = Math.round(renderResult.durationSeconds);

          logger.generation('Slideshow video assembled', {
            runId,
            duration: renderResult.durationSeconds,
            videoSize: renderResult.videoBuffer.length,
          });
        } catch (renderError) {
          await prisma.generationRun.update({
            where: { id: runId },
            data: { errorLog: `Video assembly failed: ${renderError instanceof Error ? renderError.message : String(renderError)}` },
          });
          logger.warn('Video assembly failed, storyboard with audio saved', {
            runId,
            error: renderError instanceof Error ? renderError.message : String(renderError),
          });
        }
      }
    }

    // Step 6: Finalizing — validation + save
    await job.updateProgress(STEPS.FINALIZING);
    await updateRunProgress(runId, studioId, STEPS.FINALIZING);

    // Update widget with generated data (DRAFT = awaiting user confirmation)
    await prisma.widget.update({
      where: { id: widgetId },
      data: {
        data: generatedData as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });

    // Update run to COMPLETED with final progress + original inputs for regeneration
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: {
          progress: STEPS.COMPLETED.progress,
          step: STEPS.COMPLETED.step,
          label: STEPS.COMPLETED.label,
          inputs: {
            widgetTemplateId: templateId,
            title,
            description,
            inputs,
            sourceIds,
            language,
            preferredProvider,
          },
        } as Prisma.InputJsonValue,
      },
    });

    await job.updateProgress(STEPS.COMPLETED);
    await publishStudioEvent(studioId, 'generation:complete', { runId, widgetId, type: templateId });

    logger.generation('Widget generation completed', {
      runId,
      widgetId,
      studioId,
      duration: Date.now() - jobStartTime,
      type: templateId,
    });

    return {
      success: true,
      runId,
      widgetId,
      data: generatedData as Record<string, unknown>,
    };
  } catch (error) {
    logger.error('Widget generation failed', {
      runId,
      widgetId,
      studioId,
      error: error instanceof Error ? error : String(error),
    });

    // Update widget to ERROR
    try {
      await prisma.widget.update({
        where: { id: widgetId },
        data: { status: 'ERROR' },
      });
    } catch (updateErr) {
      logger.error('Failed to update widget status', {
        widgetId,
        error: updateErr instanceof Error ? updateErr : String(updateErr),
      });
    }

    // Update run to FAILED
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        errorLog: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });
    await publishStudioEvent(studioId, 'generation:complete', { runId, widgetId, status: 'FAILED' }).catch(() => {});

    return {
      success: false,
      runId,
      widgetId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function createWidgetGenerationWorker() {
  const worker = new Worker<WidgetGenerationJob, WidgetGenerationResult>(
    QUEUE_NAME,
    processJob,
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  worker.on('completed', (job, result) => {
    logger.info('Widget worker job completed', { runId: job.data.runId, success: result.success });
  });

  worker.on('failed', (job, error) => {
    logger.error('Widget worker job failed', {
      runId: job?.data.runId,
      error: error instanceof Error ? error : String(error),
    });
  });

  worker.on('error', (error) => {
    logger.error('Widget worker error', { error: error instanceof Error ? error : String(error) });
  });

  logger.info('Widget generation worker started');

  return worker;
}

export default createWidgetGenerationWorker;
