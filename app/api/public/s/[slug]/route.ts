import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/public/s/[slug] — Get public studio data (no auth required)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const studio = await prisma.studio.findUnique({
      where: { publicSlug: slug },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        widgets: {
          where: { status: 'READY' },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            studioId: true,
            type: true,
            title: true,
            description: true,
            data: true,
            status: true,
            order: true,
            kind: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!studio || !studio.isPublic) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    return NextResponse.json({
      studio: {
        id: studio.id,
        title: studio.title,
        description: studio.description,
      },
      widgets: studio.widgets,
    });
  } catch (error) {
    logger.error('Error fetching public studio', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch studio' }, { status: 500 });
  }
}
