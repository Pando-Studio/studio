import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string; runId: string }> };

// GET /api/studios/[id]/generations/[runId] - Get a specific generation run
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, runId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Fetch generation run
    const run = await prisma.generationRun.findUnique({
      where: { id: runId, studioId },
    });

    if (!run) {
      return NextResponse.json({ error: 'Generation run not found' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    logger.error('Error fetching generation run', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch generation run' },
      { status: 500 }
    );
  }
}
