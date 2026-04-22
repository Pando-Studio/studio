import { Worker, Job } from 'bullmq';
import { prisma, Prisma } from '@/lib/db';
import { connectionOptions } from '../connection';
import type { SlideImageGenerationJob, SlideImageGenerationResult } from '../queues';

const QUEUE_NAME = 'studio-slide-image-generation';

/**
 * Slide Image Generation Worker
 *
 * Generates images for slides using:
 * - Primary: Gemini 3 Pro (Google)
 * - Fallback: Imagen 4 (Google)
 * - Alternative: Unsplash (search by keywords)
 */

/**
 * Generate image using the shared image-generation module (Gemini/DALL-E with BYOK).
 */
async function generateWithAI(prompt: string, studioId: string): Promise<string> {
  const { generateImage: genImage } = await import('../../ai/image-generation');
  const result = await genImage(prompt, studioId);
  return result.imageUrl;
}

/**
 * Search for image on Unsplash
 */
async function searchUnsplash(query: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error('Unsplash access key not configured');
  }

  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('No images found on Unsplash');
  }

  // Return the regular size image URL
  return data.results[0].urls.regular;
}

/**
 * Generate image with fallback chain
 */
async function generateSlideImage(
  prompt: string,
  source: 'ai' | 'unsplash',
  studioId: string
): Promise<string> {
  if (source === 'unsplash') {
    // Extract keywords from prompt for Unsplash search
    const keywords = prompt
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .join(' ');

    return searchUnsplash(keywords);
  }

  // AI image generation with BYOK support
  try {
    console.log('[Slide Image Worker] Generating with AI...');
    const url = await generateWithAI(prompt, studioId);
    console.log('[Slide Image Worker] AI generation successful');
    return url;
  } catch (error) {
    console.warn('[Slide Image Worker] AI generation failed:', error);
  }

  // Fallback to Unsplash
  try {
    console.log('[Slide Image Worker] Falling back to Unsplash...');
    const keywords = prompt
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .join(' ');

    return await searchUnsplash(keywords);
  } catch (unsplashError) {
    console.error('[Slide Image Worker] Unsplash fallback also failed:', unsplashError);
  }

  throw new Error('All image generation providers failed');
}

async function processJob(
  job: Job<SlideImageGenerationJob>
): Promise<SlideImageGenerationResult> {
  const { slideId, presentationId, studioId, imagePrompt, source, position } = job.data;

  console.log(`[Slide Image Worker] Starting job ${job.id} for slide ${slideId}`);

  try {
    // Generate the image
    const imageUrl = await generateSlideImage(imagePrompt, source, studioId);

    // Update the slide content with the image URL
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
    });

    if (!slide) {
      throw new Error(`Slide not found: ${slideId}`);
    }

    // Update content with image URL
    const content = slide.content as Prisma.JsonObject;

    // Update the spec if it exists
    if (content.spec && typeof content.spec === 'object') {
      const spec = content.spec as Prisma.JsonObject;
      if (spec.assets && typeof spec.assets === 'object') {
        const assets = spec.assets as Prisma.JsonObject;
        if (assets.heroImage && typeof assets.heroImage === 'object') {
          (assets.heroImage as Prisma.JsonObject).url = imageUrl;
          (assets.heroImage as Prisma.JsonObject).status = 'ready';
        }
      }
    }

    // Add imageUrl to content for easy access
    content.imageUrl = imageUrl;
    content.imagePosition = position;

    await prisma.slide.update({
      where: { id: slideId },
      data: {
        content: content as Prisma.InputJsonValue,
      },
    });

    console.log(`[Slide Image Worker] Job ${job.id} completed successfully`);

    return {
      success: true,
      slideId,
      imageUrl,
    };
  } catch (error) {
    console.error(`[Slide Image Worker] Job ${job.id} failed:`, error);

    // Mark image as error in slide content
    try {
      const slide = await prisma.slide.findUnique({
        where: { id: slideId },
      });

      if (slide) {
        const content = slide.content as Prisma.JsonObject;

        if (content.spec && typeof content.spec === 'object') {
          const spec = content.spec as Prisma.JsonObject;
          if (spec.assets && typeof spec.assets === 'object') {
            const assets = spec.assets as Prisma.JsonObject;
            if (assets.heroImage && typeof assets.heroImage === 'object') {
              (assets.heroImage as Prisma.JsonObject).status = 'error';
            }
          }
        }

        await prisma.slide.update({
          where: { id: slideId },
          data: { content: content as Prisma.InputJsonValue },
        });
      }
    } catch (updateError) {
      console.error('[Slide Image Worker] Failed to update slide error status:', updateError);
    }

    return {
      success: false,
      slideId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Create and start the worker
export function startSlideImageGenerationWorker() {
  const worker = new Worker<SlideImageGenerationJob, SlideImageGenerationResult>(
    QUEUE_NAME,
    processJob,
    {
      connection: connectionOptions,
      concurrency: 5, // Higher concurrency for image jobs
    }
  );

  worker.on('completed', (job, result) => {
    console.log(
      `[Slide Image Worker] Job ${job.id} completed:`,
      result.success ? 'success' : 'failed'
    );
  });

  worker.on('failed', (job, error) => {
    console.error(`[Slide Image Worker] Job ${job?.id} failed:`, error);
  });

  worker.on('error', (error) => {
    console.error('[Slide Image Worker] Worker error:', error);
  });

  console.log('[Slide Image Worker] Started');

  return worker;
}

export default startSlideImageGenerationWorker;
