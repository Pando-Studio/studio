import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger } from '../monitoring/logger';
import type { CinematicProvider, CinematicSection } from './providers';

/**
 * Generate a cinematic video from document content:
 * 1. For each section, generate a visual prompt and call the cinematic API
 * 2. Download all clips
 * 3. Assemble clips + TTS audio narration into a single MP4 via ffmpeg
 */
export async function renderCinematicVideo(
  sections: CinematicSection[],
  provider: CinematicProvider,
  onProgress?: (current: number, total: number) => void,
): Promise<{ videoBuffer: Buffer; durationSeconds: number }> {
  const workDir = join(tmpdir(), `cinematic-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  try {
    const clipPaths: string[] = [];
    const audioPaths: string[] = [];

    // 1. Generate clips for each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      onProgress?.(i + 1, sections.length);

      logger.info('Generating cinematic clip', {
        section: i + 1,
        total: sections.length,
        title: section.title,
        provider: provider.name,
      });

      try {
        const clip = await provider.generateClip(section.visualPrompt, {
          duration: Math.min(section.durationHint, 10),
          aspectRatio: '16:9',
        });

        // Download clip
        const clipPath = join(workDir, `clip-${i}.mp4`);
        const clipRes = await fetch(clip.videoUrl);
        const clipBuffer = Buffer.from(await clipRes.arrayBuffer());
        writeFileSync(clipPath, clipBuffer);
        clipPaths.push(clipPath);

        logger.info('Clip generated', { section: i + 1, duration: clip.durationSeconds });
      } catch (clipError) {
        logger.warn('Clip generation failed, using black frame', {
          section: i + 1,
          error: clipError instanceof Error ? clipError.message : String(clipError),
        });
        // Generate a black frame clip as fallback
        const clipPath = join(workDir, `clip-${i}.mp4`);
        execSync(
          `ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=${section.durationHint} -c:v libx264 -pix_fmt yuv420p "${clipPath}"`,
          { stdio: 'pipe' },
        );
        clipPaths.push(clipPath);
      }

      // Download audio narration if available
      if (section.audioUrl) {
        const audioPath = join(workDir, `audio-${i}.mp3`);
        const audioRes = await fetch(section.audioUrl);
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
        writeFileSync(audioPath, audioBuffer);
        audioPaths.push(audioPath);
      }
    }

    // 2. Create ffmpeg concat file
    const concatFile = join(workDir, 'concat.txt');
    const concatContent = clipPaths.map((p) => `file '${p}'`).join('\n');
    writeFileSync(concatFile, concatContent);

    // 3. Concat all clips
    const rawVideoPath = join(workDir, 'raw-video.mp4');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -pix_fmt yuv420p "${rawVideoPath}"`,
      { stdio: 'pipe', timeout: 120000 },
    );

    // 4. Concat all audio narrations
    let finalPath: string;
    if (audioPaths.length > 0) {
      const audioConcatFile = join(workDir, 'audio-concat.txt');
      const audioConcatContent = audioPaths.map((p) => `file '${p}'`).join('\n');
      writeFileSync(audioConcatFile, audioConcatContent);

      const rawAudioPath = join(workDir, 'raw-audio.mp3');
      execSync(
        `ffmpeg -y -f concat -safe 0 -i "${audioConcatFile}" -c:a libmp3lame "${rawAudioPath}"`,
        { stdio: 'pipe', timeout: 60000 },
      );

      // 5. Merge video + audio
      finalPath = join(workDir, 'final.mp4');
      execSync(
        `ffmpeg -y -i "${rawVideoPath}" -i "${rawAudioPath}" -c:v copy -c:a aac -shortest "${finalPath}"`,
        { stdio: 'pipe', timeout: 120000 },
      );
    } else {
      finalPath = rawVideoPath;
    }

    // 6. Read final video
    const { readFileSync } = await import('fs');
    const videoBuffer = readFileSync(finalPath);

    // Get duration via ffprobe
    let durationSeconds = 0;
    try {
      const probeOutput = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalPath}"`,
        { encoding: 'utf-8', timeout: 10000 },
      );
      durationSeconds = parseFloat(probeOutput.trim()) || 0;
    } catch {
      durationSeconds = sections.reduce((sum, s) => sum + s.durationHint, 0);
    }

    logger.info('Cinematic video assembled', {
      clipCount: clipPaths.length,
      videoSize: videoBuffer.length,
      durationSeconds: Math.round(durationSeconds),
    });

    return { videoBuffer, durationSeconds };
  } finally {
    // Cleanup temp dir
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}
