import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

// GET /api/studios/[id]/presentations - List all presentations for a studio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Get all presentations with their latest version and slide count
    const presentations = await prisma.presentation.findMany({
      where: { studioId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            _count: {
              select: { slides: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format response
    const formattedPresentations = presentations.map((presentation) => {
      const latestVersion = presentation.versions[0];
      return {
        id: presentation.id,
        title: presentation.title,
        createdAt: presentation.createdAt,
        updatedAt: presentation.updatedAt,
        status: latestVersion?.status || 'DRAFT',
        slidesCount: latestVersion?._count?.slides || 0,
        version: latestVersion?.version || 1,
      };
    });

    return NextResponse.json({
      presentations: formattedPresentations,
      total: formattedPresentations.length,
    });
  } catch (error) {
    logger.error('Error fetching presentations', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch presentations' },
      { status: 500 }
    );
  }
}
