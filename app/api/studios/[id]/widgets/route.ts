import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, createWidgetSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/studios/[id]/widgets - Create a widget directly (for composites)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(createWidgetSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const {
      type,
      title,
      data,
      kind,
      status,
      composition,
      orchestration,
    } = validation.data;

    // Get next order
    const lastWidget = await prisma.widget.findFirst({
      where: { studioId, parentId: null },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastWidget?.order ?? -1) + 1;

    const widget = await prisma.widget.create({
      data: {
        studioId,
        type: type as 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY' | 'MULTIPLE_CHOICE' | 'POSTIT' | 'RANKING' | 'OPENTEXT' | 'PRESENTATION' | 'SLIDE' | 'SEQUENCE' | 'COURSE_MODULE' | 'IMAGE' | 'FAQ' | 'GLOSSARY' | 'SUMMARY' | 'FLASHCARD' | 'TIMELINE' | 'REPORT' | 'DATA_TABLE',
        title,
        data: (data ?? {}) as Record<string, string>,
        kind: kind as 'LEAF' | 'COMPOSED',
        status: status as 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR',
        order: nextOrder,
        ...(composition && { composition: composition as Record<string, string> }),
        ...(orchestration && { orchestration: orchestration as Record<string, string> }),
      },
    });

    return NextResponse.json({ widget }, { status: 201 });
  } catch (error) {
    logger.error('Error creating widget', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create widget' },
      { status: 500 }
    );
  }
}
