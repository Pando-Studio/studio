import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPublicStudioAccess } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/studios/[id]/generations - List all generation runs for a studio
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getPublicStudioAccess(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Fetch generation runs
    const runs = await prisma.generationRun.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        errorLog: true,
        metadata: true,
        widgetId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ runs });
  } catch (error) {
    logger.error('Error fetching generation runs', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch generation runs' },
      { status: 500 }
    );
  }
}
