import type { CinematicProvider, CinematicClip } from './types';
import { logger } from '../../monitoring/logger';
import { SignJWT } from 'jose';

const KLING_API_URL = 'https://api.klingai.com/v1';
const COST_PER_SECOND = 0.084; // standard pricing per unit ($0.14) × 0.6 units/s

/**
 * Generate a JWT token for Kling API authentication.
 * Uses HS256 with the secret key, includes access key as issuer.
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
      throw new Error(`Kling API error: ${createRes.status} ${err}`);
    }

    const createData = await createRes.json();
    const taskId = createData.data?.task_id;
    if (!taskId) throw new Error('Kling: no task_id returned');

    logger.info('Kling: task created', { taskId });

    // Poll for completion (up to 10 min)
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollAuth = await this.getAuthHeader();
      const pollRes = await fetch(`${KLING_API_URL}/videos/text2video/${taskId}`, {
        headers: { 'Authorization': pollAuth },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      const status = pollData.data?.task_status;

      if (status === 'succeed') {
        const videoUrl = pollData.data?.task_result?.videos?.[0]?.url;
        if (!videoUrl) throw new Error('Kling: no video URL in result');

        logger.info('Kling: clip generated', { taskId, duration });

        return {
          videoUrl,
          durationSeconds: duration,
          prompt,
        };
      }

      if (status === 'failed') {
        throw new Error(`Kling generation failed: ${pollData.data?.task_status_msg || 'unknown'}`);
      }

      // Log progress every 30s
      if (i > 0 && i % 6 === 0) {
        logger.info('Kling: polling', { taskId, status, attempt: i });
      }
    }

    throw new Error('Kling: generation timed out after 10 minutes');
  }

  estimateCost(durationSeconds: number): number {
    return durationSeconds * COST_PER_SECOND;
  }
}
