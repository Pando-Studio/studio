import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger } from '../monitoring/logger';
import type { CinematicProvider, CinematicSection } from './providers';
import { CinematicFatalError } from './providers';

// Default resolution for generated clips — Kling v3 outputs 1280x720 in std mode
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/**
 * Fetch a URL with retry logic for transient failures.
 */
async function fetchWithRetry(url: string, label: string, retries = 3): Promise<Buffer> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => 'no body')}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) {
        throw new Error('Empty response body');
      }
      return buffer;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < retries) {
        logger.warn(`${label}: download failed (attempt ${attempt}/${retries}), retrying...`, { error: msg });
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      } else {
        throw new Error(`${label}: download failed after ${retries} attempts — ${msg}`);
      }
    }
  }
  throw new Error('Unreachable');
}

/**
 * Get video resolution using ffprobe.
 */
function getVideoResolution(filePath: string): { width: number; height: number } {
  try {
    const output = execSync(
      `ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`,
      { encoding: 'utf-8', timeout: 10000 },
    );
    const [w, h] = output.trim().split(',').map(Number);
    if (w && h) return { width: w, height: h };
  } catch {
    // ffprobe failed
  }
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

/**
 * Generate a cinematic video from document content:
 * 1. For each section, generate a visual clip via AI API (parallel batches)
 * 2. Download all clips + audio narrations
 * 3. Normalize all clips to same resolution
 * 4. Assemble clips + audio narration into a single MP4 via ffmpeg
 */
export async function renderCinematicVideo(
  sections: CinematicSection[],
  provider: CinematicProvider,
  onProgress?: (current: number, total: number) => void,
): Promise<{ videoBuffer: Buffer; durationSeconds: number }> {
  const workDir = join(tmpdir(), `cinematic-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  logger.info('Cinematic render started', {
    workDir,
    sections: sections.length,
    provider: provider.name,
    sectionTitles: sections.map((s) => s.title).join(', '),
  });

  try {
    const clipPaths: string[] = [];
    const audioPaths: string[] = [];
    let targetWidth = DEFAULT_WIDTH;
    let targetHeight = DEFAULT_HEIGHT;
    let successCount = 0;
    let fallbackCount = 0;

    // 1. Generate clips for each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      onProgress?.(i + 1, sections.length);

      const clipPath = join(workDir, `clip-${i}.mp4`);

      logger.info(`Generating clip ${i + 1}/${sections.length}`, {
        title: section.title,
        prompt: section.visualPrompt.slice(0, 100),
        durationHint: section.durationHint,
      });

      try {
        // Generate clip via AI provider
        const clip = await provider.generateClip(section.visualPrompt, {
          duration: Math.min(section.durationHint, 10),
          aspectRatio: '16:9',
        });

        // Download the generated clip with retry
        const clipBuffer = await fetchWithRetry(clip.videoUrl, `Clip ${i + 1}`);
        writeFileSync(clipPath, clipBuffer);

        // Validate file size
        const stat = statSync(clipPath);
        if (stat.size < 1000) {
          throw new Error(`Downloaded clip is too small (${stat.size} bytes), likely corrupted`);
        }

        // Get resolution from first successful clip to use for fallbacks
        if (successCount === 0) {
          const res = getVideoResolution(clipPath);
          targetWidth = res.width;
          targetHeight = res.height;
          logger.info('Target resolution set from first clip', { width: targetWidth, height: targetHeight });
        }

        clipPaths.push(clipPath);
        successCount++;
        logger.info(`Clip ${i + 1} downloaded`, { size: stat.size, duration: clip.durationSeconds });
      } catch (clipError) {
        // Fatal errors (billing, auth) → abort immediately, no point trying other clips
        if (clipError instanceof CinematicFatalError) {
          logger.error(`Clip ${i + 1}: fatal error, aborting all remaining clips`, { error: clipError.message });
          throw clipError;
        }

        fallbackCount++;
        const errMsg = clipError instanceof Error ? clipError.message : String(clipError);
        logger.error(`Clip ${i + 1} failed, using black frame fallback`, { error: errMsg });

        // Generate black frame at matching resolution
        try {
          execSync(
            `ffmpeg -y -f lavfi -i color=c=black:s=${targetWidth}x${targetHeight}:d=${section.durationHint}:r=30 -c:v libx264 -pix_fmt yuv420p "${clipPath}"`,
            { stdio: 'pipe', timeout: 30000 },
          );
          clipPaths.push(clipPath);
        } catch (ffmpegErr) {
          logger.error(`Black frame generation also failed for clip ${i + 1}`, {
            error: ffmpegErr instanceof Error ? ffmpegErr.message : String(ffmpegErr),
          });
          throw new Error(`Cannot generate fallback for clip ${i + 1}: ${errMsg}`);
        }
      }

      // Download audio narration if available
      if (section.audioUrl) {
        const audioPath = join(workDir, `audio-${i}.mp3`);
        try {
          const audioBuffer = await fetchWithRetry(section.audioUrl, `Audio ${i + 1}`);
          writeFileSync(audioPath, audioBuffer);
          const audioStat = statSync(audioPath);
          if (audioStat.size < 100) {
            logger.warn(`Audio ${i + 1} is suspiciously small (${audioStat.size} bytes), skipping`);
          } else {
            audioPaths.push(audioPath);
            logger.info(`Audio ${i + 1} downloaded`, { size: audioStat.size });
          }
        } catch (audioError) {
          logger.warn(`Audio ${i + 1} download failed, continuing without it`, {
            error: audioError instanceof Error ? audioError.message : String(audioError),
            url: section.audioUrl.slice(0, 80),
          });
        }
      }
    }

    logger.info('All clips processed', { successCount, fallbackCount, audioPaths: audioPaths.length });

    if (clipPaths.length === 0) {
      throw new Error('No clips generated — nothing to assemble');
    }

    // If ALL clips failed, abort (don't produce a fully black video)
    if (fallbackCount === sections.length) {
      throw new Error(`All ${sections.length} clips failed to generate. Check API balance and credentials.`);
    }

    // 2. Normalize all clips to same resolution + codec for safe concat
    const normalizedPaths: string[] = [];
    for (let i = 0; i < clipPaths.length; i++) {
      const normPath = join(workDir, `norm-${i}.mp4`);
      try {
        execSync(
          `ffmpeg -y -i "${clipPaths[i]}" -vf "scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -an "${normPath}"`,
          { stdio: 'pipe', timeout: 60000 },
        );
        normalizedPaths.push(normPath);
      } catch {
        logger.warn(`Clip ${i} normalization failed, using original`, { path: clipPaths[i] });
        normalizedPaths.push(clipPaths[i]);
      }
    }

    // 3. Create ffmpeg concat file
    const concatFile = join(workDir, 'concat.txt');
    const concatContent = normalizedPaths.map((p) => `file '${p}'`).join('\n');
    writeFileSync(concatFile, concatContent);

    // 4. Concat all video clips (copy since all normalized to same format)
    const rawVideoPath = join(workDir, 'raw-video.mp4');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${rawVideoPath}"`,
      { stdio: 'pipe', timeout: 120000 },
    );

    // 5. Concat all audio narrations and merge with video
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

      // Merge video + audio
      finalPath = join(workDir, 'final.mp4');
      execSync(
        `ffmpeg -y -i "${rawVideoPath}" -i "${rawAudioPath}" -c:v copy -c:a aac -shortest "${finalPath}"`,
        { stdio: 'pipe', timeout: 120000 },
      );
    } else {
      finalPath = rawVideoPath;
    }

    // 6. Read final video and validate
    const videoBuffer = readFileSync(finalPath);
    if (videoBuffer.length < 1000) {
      throw new Error(`Final video is too small (${videoBuffer.length} bytes), assembly likely failed`);
    }

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

    logger.info('Cinematic video assembled successfully', {
      clipCount: clipPaths.length,
      successClips: successCount,
      fallbackClips: fallbackCount,
      audioTracks: audioPaths.length,
      videoSize: `${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`,
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
