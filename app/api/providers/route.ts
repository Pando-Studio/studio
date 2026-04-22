import { NextResponse } from 'next/server';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import {
  saveProviderConfig,
  deleteProviderConfig,
  validateApiKey,
  getProviderConfigs,
} from '@/lib/ai/byok';
import { getAvailableProviders, PROVIDER_INFO, type ProviderKey } from '@/lib/ai/providers';

// GET /api/providers - Get provider info and configs for a studio
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    if (!studioId) {
      return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
    }

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Get available providers
    const available = await getAvailableProviders(studioId);
    const configs = await getProviderConfigs(studioId);

    return NextResponse.json({
      providers: PROVIDER_INFO,
      available: available.available,
      byok: available.byok,
      env: available.env,
      configs,
    });
  } catch (error) {
    logger.error('Error getting providers', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to get providers' }, { status: 500 });
  }
}

// POST /api/providers - Save or update a BYOK config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studioId, provider, apiKey } = body;

    if (!studioId || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'studioId, provider, and apiKey are required' },
        { status: 400 }
      );
    }

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Validate API key
    const validation = await validateApiKey(provider as ProviderKey, apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid API key', details: validation.error },
        { status: 400 }
      );
    }

    // Save config
    await saveProviderConfig(studioId, provider as ProviderKey, apiKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error saving provider config', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to save provider config' }, { status: 500 });
  }
}

// DELETE /api/providers - Delete a BYOK config
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');
    const provider = searchParams.get('provider');

    if (!studioId || !provider) {
      return NextResponse.json(
        { error: 'studioId and provider are required' },
        { status: 400 }
      );
    }

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    await deleteProviderConfig(studioId, provider as ProviderKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting provider config', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to delete provider config' }, { status: 500 });
  }
}
