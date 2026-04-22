import { PrismaClient } from '@prisma/client';
import { renderSlideshowVideo } from '../lib/video/render';
import type { SlideData } from '../lib/video/slides';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find the latest VIDEO widget with audio
    const widget = await prisma.widget.findFirst({
      where: { type: 'VIDEO' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, data: true },
    });

    if (!widget) {
      console.error('No VIDEO widget found');
      return;
    }

    const data = widget.data as Record<string, unknown>;
    const script = data.script as { slides: SlideData[] };

    if (!script?.slides?.length) {
      console.error('No slides found in widget');
      return;
    }

    const slidesWithAudio = script.slides.filter((s) => s.audioUrl);
    console.log(`Widget: ${widget.id}`);
    console.log(`Slides: ${script.slides.length} (${slidesWithAudio.length} with audio)`);

    console.log('Starting Remotion render...');
    const startTime = Date.now();

    const result = await renderSlideshowVideo(script.slides);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\nSUCCESS in ${elapsed}s`);
    console.log(`Video: ${result.videoBuffer.length} bytes (${Math.round(result.videoBuffer.length / 1024 / 1024)}MB)`);
    console.log(`Thumbnail: ${result.thumbnailBuffer.length} bytes`);
    console.log(`Duration: ${Math.round(result.durationSeconds)}s`);

    // Save locally for inspection
    const fs = await import('fs');
    fs.writeFileSync('/tmp/test-video.mp4', result.videoBuffer);
    fs.writeFileSync('/tmp/test-thumb.jpg', result.thumbnailBuffer);
    console.log('\nSaved to /tmp/test-video.mp4 and /tmp/test-thumb.jpg');
  } catch (error) {
    console.error('FAILED:', error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
