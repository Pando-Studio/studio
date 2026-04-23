import type { CinematicProvider, CinematicClip } from './types';
import { logger } from '../../monitoring/logger';

const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const COST_PER_SECOND = 0.05;

export class RunwayProvider implements CinematicProvider {
  name = 'Runway Gen-4';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateClip(
    prompt: string,
    options: { duration: number; aspectRatio?: '16:9' | '9:16' }
  ): Promise<CinematicClip> {
    const duration = Math.min(Math.max(options.duration, 5), 10);

    logger.info('Runway: generating clip', { prompt: prompt.slice(0, 80), duration });

    const createRes = await fetch(`${RUNWAY_API_URL}/image_to_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: 'gen4_turbo',
        promptText: prompt,
        duration,
        ratio: options.aspectRatio === '9:16' ? '720:1280' : '1280:720',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Runway API error: ${createRes.status} ${err}`);
    }

    const createData = await createRes.json();
    const taskId = createData.id;
    if (!taskId) throw new Error('Runway: no task id returned');

    // Poll for completion
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollRes = await fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();

      if (pollData.status === 'SUCCEEDED') {
        const videoUrl = pollData.output?.[0];
        if (!videoUrl) throw new Error('Runway: no video URL in result');

        return {
          videoUrl,
          durationSeconds: duration,
          prompt,
        };
      }

      if (pollData.status === 'FAILED') {
        throw new Error(`Runway generation failed: ${pollData.failure || 'unknown'}`);
      }
    }

    throw new Error('Runway: generation timed out after 10 minutes');
  }

  estimateCost(durationSeconds: number): number {
    return durationSeconds * COST_PER_SECOND;
  }
}
