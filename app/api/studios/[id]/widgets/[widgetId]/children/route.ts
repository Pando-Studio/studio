import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string; widgetId: string }> };

// GET /api/studios/[id]/widgets/[widgetId]/children - List children of a widget
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const url = new URL(request.url);
    const slotId = url.searchParams.get('slotId');

    const children = await prisma.widget.findMany({
      where: {
        parentId: widgetId,
        studioId,
        ...(slotId && { slotId }),
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ children });
  } catch (error) {
    logger.error('Error fetching widget children', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

// POST /api/studios/[id]/widgets/[widgetId]/children - Create a child widget
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Verify parent exists
    const parent = await prisma.widget.findUnique({
      where: { id: widgetId, studioId },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent widget not found' }, { status: 404 });
    }

    if (parent.kind === 'LEAF') {
      return NextResponse.json(
        { error: 'Cannot add children to a leaf widget' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, title, slotId, data = {}, kind = 'LEAF' } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: 'type and title are required' },
        { status: 400 }
      );
    }

    // Get next order
    const lastChild = await prisma.widget.findFirst({
      where: { parentId: widgetId, ...(slotId && { slotId }) },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastChild?.order ?? -1) + 1;

    const child = await prisma.widget.create({
      data: {
        studioId,
        type,
        title,
        data,
        kind,
        parentId: widgetId,
        slotId: slotId || null,
        order: nextOrder,
        status: 'READY',
      },
    });

    return NextResponse.json({ widget: child }, { status: 201 });
  } catch (error) {
    logger.error('Error creating child widget', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create child' },
      { status: 500 }
    );
  }
}
