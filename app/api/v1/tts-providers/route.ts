import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api/api-key-auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { getApiKeyForProvider, type ProviderKey } from '@/lib/ai/providers';
import { prisma } from '@/lib/db';
import type { TTSProviderKey } from '@/lib/ai/tts';

const TTS_PROVIDERS: Array<{ key: TTSProviderKey; name: string; providerKey: ProviderKey }> = [
  { key: 'openai', name: 'OpenAI', providerKey: 'openai' },
  { key: 'mistral', name: 'Mistral', providerKey: 'mistral' },
  { key: 'elevenlabs', name: 'ElevenLabs', providerKey: 'elevenlabs' },
  { key: 'gemini', name: 'Gemini (Google)', providerKey: 'google' },
];

/**
 * GET /api/v1/tts-providers
 *
 * Returns which TTS providers are available for the authenticated user.
 * Requires API key authentication (Bearer sk_...).
 */
export async function GET(request: Request) {
  // Auth
  const auth = await authenticateApiKey(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Rate limit (shared with other v1 endpoints)
  const rateLimitResult = await checkRateLimit(`api:${auth.userId}`, 100, 3600);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
      { status: 429 },
    );
  }

  // Find the user's API studio for key resolution
  const apiStudio = await prisma.studio.findFirst({
    where: { userId: auth.userId, title: '__api__' },
    select: { id: true },
  });

  const studioId = apiStudio?.id;

  const providers = await Promise.all(
    TTS_PROVIDERS.map(async ({ key, name, providerKey }) => {
      if (!studioId) {
        // No studio yet — only check env keys
        const envKey = process.env[
          providerKey === 'google' ? 'GOOGLE_API_KEY'
            : `${providerKey.toUpperCase()}_API_KEY`
        ];
        return { key, name, available: !!envKey };
      }
      const apiKey = await getApiKeyForProvider(studioId, providerKey);
      return { key, name, available: !!apiKey };
    }),
  );

  return NextResponse.json({ providers });
}
