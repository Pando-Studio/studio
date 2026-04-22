import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>;
}

// GET /api/studios/[id]/sources/[sourceId]/chunks
// Returns paginated chunks for a source
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, sourceId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Verify the source belongs to this studio
    const source = await prisma.studioSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.studioId !== studioId) {
      return NextResponse.json(
        { error: 'Source does not belong to this studio' },
        { status: 403 },
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
    const search = url.searchParams.get('search')?.trim() || undefined;

    // Build where clause
    const where: { sourceId: string; content?: { contains: string; mode: 'insensitive' } } = {
      sourceId,
    };

    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }

    // Fetch chunks and total count in parallel
    const [chunks, total] = await Promise.all([
      prisma.studioSourceChunk.findMany({
        where,
        orderBy: { chunkIndex: 'asc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          content: true,
          chunkIndex: true,
          metadata: true,
          pageNumber: true,
          createdAt: true,
        },
      }),
      prisma.studioSourceChunk.count({ where }),
    ]);

    return NextResponse.json({ chunks, total, offset, limit });
  } catch (error: unknown) {
    const resolvedParams = await params;
    logger.error('Error fetching source chunks', {
      studioId: resolvedParams.id,
      sourceId: resolvedParams.sourceId,
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Error fetching source chunks' },
      { status: 500 },
    );
  }
}
