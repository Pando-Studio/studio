import type { CinematicProvider } from './types';
import { KlingProvider } from './kling';
import { RunwayProvider } from './runway';

export type { CinematicProvider, CinematicClip, CinematicSection } from './types';

export function getCinematicProvider(providerName: string): CinematicProvider {
  switch (providerName) {
    case 'kling': {
      const accessKey = process.env.KLING_ACCESS_KEY;
      const secretKey = process.env.KLING_SECRET_KEY;
      if (!accessKey || !secretKey) {
        throw new Error(
          'Kling API requires KLING_ACCESS_KEY and KLING_SECRET_KEY in environment. ' +
          'Get keys at https://klingai.com/global/dev/'
        );
      }
      return new KlingProvider(accessKey, secretKey);
    }
    case 'runway': {
      const apiKey = process.env.RUNWAY_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Runway API requires RUNWAY_API_KEY in environment. ' +
          'Get key at https://dev.runwayml.com'
        );
      }
      return new RunwayProvider(apiKey);
    }
    case 'sora':
      throw new Error('Sora provider not yet implemented');
    case 'veo':
      throw new Error('Veo provider not yet implemented');
    default:
      throw new Error(`Unknown cinematic provider: ${providerName}`);
  }
}
