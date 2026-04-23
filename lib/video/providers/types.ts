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
