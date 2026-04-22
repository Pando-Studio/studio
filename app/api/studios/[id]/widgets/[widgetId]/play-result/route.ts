import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody } from '@/lib/api/schemas';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string; widgetId: string }> };

const submitResultSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  maxScore: z.number().optional(),
  duration: z.number().optional(), // seconds
  status: z.enum(['started', 'completed']).default('started'),
});

// GET — Get current user's play result for a widget
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const result = await prisma.widgetPlayResult.findUnique({
      where: { widgetId_userId: { widgetId, userId: ctx.userId } },
    });

    return NextResponse.json({ result });
  } catch (error) {
    logger.error('Error fetching play result', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch result' }, { status: 500 });
  }
}

// POST — Create or update play result (upsert)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(submitResultSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { score, maxScore, duration, status } = validation.data;

    const result = await prisma.widgetPlayResult.upsert({
      where: { widgetId_userId: { widgetId, userId: ctx.userId } },
      create: {
        widgetId,
        userId: ctx.userId,
        studioId,
        score,
        maxScore,
        duration,
        status,
        completedAt: status === 'completed' ? new Date() : null,
      },
      update: {
        score,
        maxScore,
        duration,
        status,
        attempts: { increment: 1 },
        completedAt: status === 'completed' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    logger.error('Error saving play result', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
