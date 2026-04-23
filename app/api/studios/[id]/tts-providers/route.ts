import { NextResponse } from 'next/server';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { getApiKeyForProvider, type ProviderKey } from '@/lib/ai/providers';
import type { TTSProviderKey } from '@/lib/ai/tts';

type RouteParams = { params: Promise<{ id: string }> };

const TTS_PROVIDERS: Array<{ key: TTSProviderKey; name: string; providerKey: ProviderKey }> = [
  { key: 'openai', name: 'OpenAI', providerKey: 'openai' },
  { key: 'mistral', name: 'Mistral', providerKey: 'mistral' },
  { key: 'elevenlabs', name: 'ElevenLabs', providerKey: 'elevenlabs' },
  { key: 'gemini', name: 'Gemini', providerKey: 'google' },
];

// GET /api/studios/[id]/tts-providers
// Returns which TTS providers have API keys available for this studio.
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: studioId } = await params;

  const ctx = await getStudioAuthContext(studioId);
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const providers = await Promise.all(
    TTS_PROVIDERS.map(async ({ key, name, providerKey }) => {
      const apiKey = await getApiKeyForProvider(studioId, providerKey);
      return { key, name, available: !!apiKey };
    }),
  );

  return NextResponse.json({ providers });
}
