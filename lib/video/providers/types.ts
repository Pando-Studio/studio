export interface CinematicClip {
  videoUrl: string;
  durationSeconds: number;
  prompt: string;
}

export interface CinematicProvider {
  name: string;
  generateClip(prompt: string, options: {
    duration: number;
    aspectRatio?: '16:9' | '9:16';
  }): Promise<CinematicClip>;
  estimateCost(durationSeconds: number): number;
}

export interface CinematicSection {
  id: string;
  title: string;
  visualPrompt: string;
  narration: string;
  durationHint: number;
  audioUrl?: string;
}

/**
 * Fatal error that should abort the entire cinematic generation immediately.
 * Used for billing issues, auth failures, etc. — no point retrying other clips.
 */
export class CinematicFatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CinematicFatalError';
  }
}
