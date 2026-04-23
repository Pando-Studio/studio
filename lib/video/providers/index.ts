import type { CinematicProvider } from './types';
import { KlingProvider } from './kling';
import { RunwayProvider } from './runway';

export type { CinematicProvider, CinematicClip, CinematicSection } from './types';

const PROVIDER_ENV_KEYS: Record<string, string> = {
  kling: 'KLING_API_KEY',
  runway: 'RUNWAY_API_KEY',
  sora: 'OPENAI_API_KEY',
  veo: 'GOOGLE_API_KEY',
};

export function getCinematicProvider(providerName: string): CinematicProvider {
  const envKey = PROVIDER_ENV_KEYS[providerName];
  const apiKey = envKey ? process.env[envKey] : undefined;

  if (!apiKey) {
    throw new Error(
      `No API key found for cinematic provider "${providerName}". ` +
      `Set ${envKey || 'the corresponding API key'} in your environment.`
    );
  }

  switch (providerName) {
    case 'kling':
      return new KlingProvider(apiKey);
    case 'runway':
      return new RunwayProvider(apiKey);
    case 'sora':
      // TODO: implement Sora provider
      throw new Error('Sora provider not yet implemented');
    case 'veo':
      // TODO: implement Veo provider
      throw new Error('Veo provider not yet implemented');
    default:
      throw new Error(`Unknown cinematic provider: ${providerName}`);
  }
}
