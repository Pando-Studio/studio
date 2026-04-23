import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext, requireStudioAccess } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, updateStudioSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/studios/[id] - Get studio details
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requireStudioAccess(id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const studio = await prisma.studio.findUnique({
      where: { id },
      include: {
        sources: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { chunks: true } },
            tags: { include: { tag: true } },
          },
        },
        widgets: {
          orderBy: { createdAt: 'desc' },
        },
        presentations: {
          orderBy: { createdAt: 'desc' },
        },
        providerConfigs: {
          select: {
            provider: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            sources: true,
            widgets: true,
            presentations: true,
            conversations: true,
          },
        },
      },
    });

    return NextResponse.json({ studio, role: ctx.effectiveRole });
  } catch (error: unknown) {
    logger.error('Error fetching studio', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch studio' }, { status: 500 });
  }
}

// PATCH /api/studios/[id] - Update studio
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await getStudioAuthContext(id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(updateStudioSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { title, description, settings } = validation.data;

    const studio = await prisma.studio.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(settings && { settings: settings as Record<string, string> }),
      },
    });

    return NextResponse.json({ studio });
  } catch (error: unknown) {
    logger.error('Error updating studio', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to update studio' }, { status: 500 });
  }
}

// DELETE /api/studios/[id] - Delete studio
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await getStudioAuthContext(id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    await prisma.studio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error deleting studio', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to delete studio' }, { status: 500 });
  }
}
