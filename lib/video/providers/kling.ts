import type { CinematicProvider, CinematicClip } from './types';
import { logger } from '../../monitoring/logger';

const KLING_API_URL = 'https://api.klingai.com/v1';
const COST_PER_SECOND = 0.075;

export class KlingProvider implements CinematicProvider {
  name = 'Kling 3.0';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateClip(
    prompt: string,
    options: { duration: number; aspectRatio?: '16:9' | '9:16' }
  ): Promise<CinematicClip> {
    const duration = Math.min(Math.max(options.duration, 5), 10);

    logger.info('Kling: generating clip', { prompt: prompt.slice(0, 80), duration });

    // Create generation task
    const createRes = await fetch(`${KLING_API_URL}/videos/text2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        duration: `${duration}`,
        aspect_ratio: options.aspectRatio ?? '16:9',
        model: 'kling-v3',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Kling API error: ${createRes.status} ${err}`);
    }

    const createData = await createRes.json();
    const taskId = createData.data?.task_id;
    if (!taskId) throw new Error('Kling: no task_id returned');

    // Poll for completion
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollRes = await fetch(`${KLING_API_URL}/videos/text2video/${taskId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      const status = pollData.data?.task_status;

      if (status === 'succeed') {
        const videoUrl = pollData.data?.task_result?.videos?.[0]?.url;
        if (!videoUrl) throw new Error('Kling: no video URL in result');

        return {
          videoUrl,
          durationSeconds: duration,
          prompt,
        };
      }

      if (status === 'failed') {
        throw new Error(`Kling generation failed: ${pollData.data?.task_status_msg || 'unknown'}`);
      }
    }

    throw new Error('Kling: generation timed out after 10 minutes');
  }

  estimateCost(durationSeconds: number): number {
    return durationSeconds * COST_PER_SECOND;
  }
}
