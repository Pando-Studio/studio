import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { getTheme } from './themes';
import type { SlideData } from './slides';
import { logger } from '../monitoring/logger';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const COMPOSITION_ID = 'SlideshowVideo';

// Entry point for Remotion — must be a file that registers the composition
const ENTRY_POINT = path.resolve(__dirname, 'remotion-entry.tsx');

/**
 * Calculate exact duration in frames for each slide based on its audio file.
 * Falls back to durationHint if audio cannot be probed.
 */
async function getSlideDurations(slides: SlideData[]): Promise<number[]> {
  const durations: number[] = [];

  for (const slide of slides) {
    if (slide.audioUrl) {
      try {
        const seconds = await getAudioDurationInSeconds(slide.audioUrl);
        // Add 0.5s padding after each audio
        durations.push(Math.ceil((seconds + 0.5) * FPS));
      } catch {
        logger.warn('Could not probe audio duration, using durationHint', {
          slideId: slide.id,
        });
        durations.push(Math.ceil(slide.durationHint * FPS));
      }
    } else {
      durations.push(Math.ceil(slide.durationHint * FPS));
    }
  }

  return durations;
}

export interface RenderResult {
  videoBuffer: Buffer;
  thumbnailBuffer: Buffer;
  durationSeconds: number;
}

/**
 * Render a slideshow video from slides + audio narrations.
 */
export async function renderSlideshowVideo(
  slides: SlideData[],
  options?: { theme?: string }
): Promise<RenderResult> {
  const theme = getTheme(options?.theme);

  logger.info('Starting video render', { slideCount: slides.length, theme: options?.theme });

  // 1. Calculate exact durations from audio files
  const slideDurations = await getSlideDurations(slides);
  const totalFrames = slideDurations.reduce((sum, d) => sum + d, 0);
  const durationSeconds = totalFrames / FPS;

  logger.info('Durations calculated', {
    totalFrames,
    durationSeconds: Math.round(durationSeconds),
    perSlide: slideDurations.map((d) => Math.round(d / FPS)),
  });

  // 2. Bundle the Remotion composition
  const bundled = await bundle({
    entryPoint: ENTRY_POINT,
    // Quiet webpack output
    onProgress: () => {},
  });

  const inputProps = { slides, slideDurations, theme };

  // 3. Select composition
  const composition = await selectComposition({
    serveUrl: bundled,
    id: COMPOSITION_ID,
    inputProps,
  });

  // Override duration with calculated total
  composition.durationInFrames = totalFrames;
  composition.fps = FPS;
  composition.width = WIDTH;
  composition.height = HEIGHT;

  // 4. Render video
  logger.info('Rendering video...', { totalFrames, durationSeconds: Math.round(durationSeconds) });

  const { buffer: videoBuffer } = await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: null,
    inputProps,
    imageFormat: 'jpeg',
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 25 === 0) {
        logger.info('Render progress', { progress: Math.round(progress * 100) });
      }
    },
  });

  if (!videoBuffer) {
    throw new Error('Remotion renderMedia returned null buffer');
  }

  // 5. Render thumbnail (first frame)
  const thumbnailResult = await renderStill({
    composition,
    serveUrl: bundled,
    frame: 0,
    imageFormat: 'jpeg',
    inputProps,
    output: null,
  });

  const thumbnailBuffer = thumbnailResult.buffer
    ? Buffer.from(thumbnailResult.buffer)
    : Buffer.alloc(0);

  logger.info('Video render complete', {
    videoSize: videoBuffer.length,
    thumbnailSize: thumbnailBuffer.length,
    durationSeconds: Math.round(durationSeconds),
  });

  return {
    videoBuffer: Buffer.from(videoBuffer),
    thumbnailBuffer,
    durationSeconds,
  };
}
