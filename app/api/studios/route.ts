import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, createStudioSchema } from '@/lib/api/schemas';

// GET /api/studios - List all studios for the user
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    const studios = await prisma.studio.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            sources: true,
            widgets: true,
            presentations: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ studios });
  } catch (error) {
    logger.error('Error fetching studios', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch studios' }, { status: 500 });
  }
}

// POST /api/studios - Create a new studio
export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    const body = await request.json();
    const validation = validateBody(createStudioSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { title, description, settings } = validation.data;

    const studio = await prisma.studio.create({
      data: {
        title,
        description,
        settings: (settings || {}) as Record<string, string>,
        userId,
        isAnonymous: false,
      },
      include: {
        _count: {
          select: {
            sources: true,
            widgets: true,
            presentations: true,
          },
        },
      },
    });

    return NextResponse.json({ studio }, { status: 201 });
  } catch (error) {
    logger.error('Error creating studio', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to create studio' }, { status: 500 });
  }
}
