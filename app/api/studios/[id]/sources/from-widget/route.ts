import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { convertWidgetToSource, convertCoursePlanToSource } from '@/lib/ai/widget-to-source';
import { validateBody, sourceFromWidgetSchema } from '@/lib/api/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Convert a widget or course plan to a StudioSource for RAG
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(sourceFromWidgetSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { widgetId, coursePlanId } = validation.data;

    let result: { sourceId: string };

    if (widgetId) {
      result = await convertWidgetToSource(studioId, widgetId);
    } else {
      // Zod refine guarantees coursePlanId is defined when widgetId is not
      result = await convertCoursePlanToSource(studioId, coursePlanId!);
    }

    // Fetch the created source
    const source = await prisma.studioSource.findUnique({
      where: { id: result.sourceId },
    });

    return NextResponse.json({ source });
  } catch (error) {
    logger.error('Error converting to source', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la conversion en source' },
      { status: 500 }
    );
  }
}
