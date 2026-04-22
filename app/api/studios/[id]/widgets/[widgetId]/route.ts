import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, updateWidgetSchema } from '@/lib/api/schemas';
import { publishStudioEvent } from '@/lib/events/studio-events';

type RouteParams = { params: Promise<{ id: string; widgetId: string }> };

// GET /api/studios/[id]/widgets/[widgetId] - Get a specific widget
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const widget = await prisma.widget.findUnique({
      where: { id: widgetId, studioId },
      include: { children: { orderBy: { order: 'asc' } } },
    });

    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json({ widget });
  } catch (error) {
    logger.error('Error fetching widget', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch widget' },
      { status: 500 }
    );
  }
}

// PATCH /api/studios/[id]/widgets/[widgetId] - Update a widget
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(updateWidgetSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { title, data, status, kind, parentId, slotId, composition, orchestration } = validation.data;

    const existingWidget = await prisma.widget.findUnique({
      where: { id: widgetId, studioId },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const updatedWidget = await prisma.widget.update({
      where: { id: widgetId },
      data: {
        ...(title !== undefined && { title }),
        ...(data !== undefined && { data: data as Record<string, string> }),
        ...(status !== undefined && { status: status as 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR' }),
        ...(kind !== undefined && { kind: kind as 'LEAF' | 'COMPOSED' }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(slotId !== undefined && { slotId: slotId || null }),
        ...(composition !== undefined && { composition: composition as Record<string, string> }),
        ...(orchestration !== undefined && { orchestration: orchestration as Record<string, string> }),
        updatedAt: new Date(),
      },
    });

    await publishStudioEvent(studioId, 'widget:updated', { widgetId }).catch(() => {});

    return NextResponse.json({ widget: updatedWidget });
  } catch (error) {
    logger.error('Error updating widget', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update widget' },
      { status: 500 }
    );
  }
}

// DELETE /api/studios/[id]/widgets/[widgetId] - Delete a widget
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const existingWidget = await prisma.widget.findUnique({
      where: { id: widgetId, studioId },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    await prisma.widget.delete({
      where: { id: widgetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting widget', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete widget' },
      { status: 500 }
    );
  }
}
