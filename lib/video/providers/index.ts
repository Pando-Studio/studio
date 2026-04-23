import type { CinematicProvider } from './types';
import { KlingProvider } from './kling';
import { RunwayProvider } from './runway';

export type { CinematicProvider, CinematicClip, CinematicSection } from './types';
export { CinematicFatalError } from './types';

export function getCinematicProvider(providerName: string): CinematicProvider {
  switch (providerName) {
    case 'kling': {
      let accessKey = process.env.KLING_ACCESS_KEY;
      let secretKey = process.env.KLING_SECRET_KEY;
      // Fallback: read from .env file directly if not in process.env (instrumentation workers)
      if (!accessKey || !secretKey) {
        try {
          const fs = require('fs');
          const path = require('path');
          const envPath = path.resolve(process.cwd(), '.env');
          const envContent = fs.readFileSync(envPath, 'utf-8');
          for (const line of envContent.split('\n')) {
            const match = line.match(/^(KLING_ACCESS_KEY|KLING_SECRET_KEY)=(.+)$/);
            if (match) {
              if (match[1] === 'KLING_ACCESS_KEY') accessKey = match[2].trim();
              if (match[1] === 'KLING_SECRET_KEY') secretKey = match[2].trim();
            }
          }
        } catch {
          // .env file not available
        }
      }
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
