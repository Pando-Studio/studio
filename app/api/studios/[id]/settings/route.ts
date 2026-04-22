import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { PROVIDER_INFO, type ProviderKey } from '@/lib/ai/providers';
import { validateBody, updateSettingsSchema } from '@/lib/api/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get studio settings (provider preferences)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    return NextResponse.json({
      preferredProvider: ctx.studio.preferredProvider,
      preferredModel: ctx.studio.preferredModel,
      settings: ctx.studio.settings,
      providers: PROVIDER_INFO,
    });
  } catch (error) {
    logger.error('Error fetching studio settings', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Update studio settings
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(updateSettingsSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { preferredProvider, preferredModel } = validation.data;

    // Validate provider against known providers if provided
    if (preferredProvider !== undefined && preferredProvider !== null) {
      const validProviders = Object.keys(PROVIDER_INFO);
      if (!validProviders.includes(preferredProvider)) {
        return NextResponse.json({ error: 'Provider invalide' }, { status: 400 });
      }
    }

    const updated = await prisma.studio.update({
      where: { id: studioId },
      data: {
        preferredProvider: preferredProvider ?? undefined,
        preferredModel: preferredModel ?? undefined,
      },
      select: {
        preferredProvider: true,
        preferredModel: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating studio settings', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
