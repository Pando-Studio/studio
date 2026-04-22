import { NextResponse } from 'next/server';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { PROVIDER_INFO } from '@/lib/ai/providers';
import {
  saveUserProviderConfig,
  deleteUserProviderConfig,
  getUserProviderConfigs,
  validateApiKey,
} from '@/lib/ai/byok';
import { getAvailableProvidersForUser, type ProviderKey } from '@/lib/ai/providers';
import { validateBody, saveProviderSchema } from '@/lib/api/schemas';

// GET - List user-level provider configs
export async function GET() {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { userId } = ctx;
    const configs = await getUserProviderConfigs(userId);
    const { available, byok, env } = await getAvailableProvidersForUser(userId);

    return NextResponse.json({
      providers: PROVIDER_INFO,
      configs,
      available,
      byok,
      env,
    });
  } catch (error) {
    logger.error('Error fetching user providers', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Save a user-level API key
export async function POST(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(saveProviderSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { provider, apiKey } = validation.data;

    const validProviders = Object.keys(PROVIDER_INFO);
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Provider invalide' }, { status: 400 });
    }

    // Validate the API key against provider
    const keyCheck = await validateApiKey(provider as ProviderKey, apiKey);
    if (!keyCheck.valid) {
      return NextResponse.json(
        { error: keyCheck.error || 'Cle API invalide' },
        { status: 400 }
      );
    }

    await saveUserProviderConfig(ctx.userId, provider as ProviderKey, apiKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error saving user provider config', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Remove a user-level API key
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json({ error: 'Provider requis' }, { status: 400 });
    }

    await deleteUserProviderConfig(ctx.userId, provider as ProviderKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting user provider config', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
