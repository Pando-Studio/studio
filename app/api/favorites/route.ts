import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, favoriteSchema } from '@/lib/api/schemas';

// GET /api/favorites - List all favorites for the authenticated user
export async function GET() {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: {
        widget: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            kind: true,
            studioId: true,
            studio: { select: { title: true } },
          },
        },
        coursePlan: {
          select: {
            id: true,
            title: true,
            status: true,
            studioId: true,
            studio: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    logger.error('Error fetching favorites', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add a favorite
export async function POST(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    const body = await request.json();
    const validation = validateBody(favoriteSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { widgetId, coursePlanId } = validation.data;

    const favorite = await prisma.userFavorite.create({
      data: {
        userId,
        widgetId: widgetId || null,
        coursePlanId: coursePlanId || null,
      },
    });

    return NextResponse.json({ favorite });
  } catch (error: unknown) {
    // Handle unique constraint violation (already favorited)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Already favorited' },
        { status: 409 }
      );
    }
    logger.error('Error creating favorite', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to create favorite' },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites - Remove a favorite
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    const body = await request.json();
    const validation = validateBody(favoriteSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { widgetId, coursePlanId } = validation.data;

    if (widgetId) {
      await prisma.userFavorite.deleteMany({
        where: { userId, widgetId },
      });
    } else if (coursePlanId) {
      await prisma.userFavorite.deleteMany({
        where: { userId, coursePlanId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting favorite', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to delete favorite' },
      { status: 500 }
    );
  }
}
