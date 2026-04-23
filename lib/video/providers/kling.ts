import type { CinematicProvider, CinematicClip } from './types';
import { CinematicFatalError } from './types';
import { logger } from '../../monitoring/logger';
import { SignJWT } from 'jose';

const KLING_API_URL = 'https://api.klingai.com/v1';
const COST_PER_SECOND = 0.084; // standard pricing per unit ($0.14) × 0.6 units/s

/**
 * Generate a JWT token for Kling API authentication.
 * Token is regenerated per request to avoid expiry issues during long polling.
 */
async function generateKlingToken(accessKey: string, secretKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(secretKey);

  const token = await new SignJWT({
    iss: accessKey,
    exp: now + 1800, // 30 min
    nbf: now - 5,
    iat: now,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return token;
}

export class KlingProvider implements CinematicProvider {
  name = 'Kling 3.0';
  private accessKey: string;
  private secretKey: string;

  constructor(accessKey: string, secretKey: string) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  private async getAuthHeader(): Promise<string> {
    const token = await generateKlingToken(this.accessKey, this.secretKey);
    return `Bearer ${token}`;
  }

  async generateClip(
    prompt: string,
    options: { duration: number; aspectRatio?: '16:9' | '9:16' }
  ): Promise<CinematicClip> {
    const duration = Math.min(Math.max(options.duration, 5), 10);

    logger.info('Kling: generating clip', { prompt: prompt.slice(0, 80), duration });

    const auth = await this.getAuthHeader();

    // Create generation task
    const createRes = await fetch(`${KLING_API_URL}/videos/text2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify({
        prompt,
        duration: `${duration}`,
        aspect_ratio: options.aspectRatio ?? '16:9',
        model_name: 'kling-v3',
        mode: 'std',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      logger.error('Kling: task creation failed', { status: createRes.status, error: err });
      // Fatal errors: billing, auth — abort immediately, don't retry other clips
      if (createRes.status === 429 || createRes.status === 401 || createRes.status === 403) {
        const parsed = JSON.parse(err).message || err;
        throw new CinematicFatalError(`Kling: ${parsed}`);
      }
      throw new Error(`Kling API error: ${createRes.status} ${err}`);
    }

    const createData = await createRes.json();
    const taskId = createData.data?.task_id;
    if (!taskId) {
      logger.error('Kling: no task_id in response', { response: JSON.stringify(createData).slice(0, 500) });
      throw new Error('Kling: no task_id returned');
    }

    logger.info('Kling: task created', { taskId });

    // Poll for completion (up to 10 min)
    let consecutiveErrors = 0;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      // Fresh token for each poll to avoid JWT expiry
      const pollAuth = await this.getAuthHeader();
      const pollRes = await fetch(`${KLING_API_URL}/videos/text2video/${taskId}`, {
        headers: { 'Authorization': pollAuth },
      });

      if (!pollRes.ok) {
        consecutiveErrors++;
        const errText = await pollRes.text().catch(() => '');
        logger.warn('Kling: poll request failed', { taskId, status: pollRes.status, error: errText, consecutiveErrors });
        // Abort after 5 consecutive poll failures
        if (consecutiveErrors >= 5) {
          throw new Error(`Kling: polling failed ${consecutiveErrors} times consecutively (last: ${pollRes.status})`);
        }
        continue;
      }
      consecutiveErrors = 0;

      const pollData = await pollRes.json();
      const status = pollData.data?.task_status;

      if (status === 'succeed') {
        const videoUrl = pollData.data?.task_result?.videos?.[0]?.url;
        if (!videoUrl) {
          logger.error('Kling: succeed but no video URL', { taskId, result: JSON.stringify(pollData.data?.task_result).slice(0, 500) });
          throw new Error('Kling: no video URL in result');
        }

        logger.info('Kling: clip generated successfully', { taskId, duration, videoUrl: videoUrl.slice(0, 80) });

        return {
          videoUrl,
          durationSeconds: duration,
          prompt,
        };
      }

      if (status === 'failed') {
        const msg = pollData.data?.task_status_msg || 'unknown';
        logger.error('Kling: generation failed', { taskId, message: msg });
        throw new Error(`Kling generation failed: ${msg}`);
      }

      // Log progress every 30s
      if (i > 0 && i % 6 === 0) {
        logger.info('Kling: polling', { taskId, status, attempt: i, elapsed: `${i * 5}s` });
      }
    }

    throw new Error('Kling: generation timed out after 10 minutes');
  }

  estimateCost(durationSeconds: number): number {
    return durationSeconds * COST_PER_SECOND;
  }
}
