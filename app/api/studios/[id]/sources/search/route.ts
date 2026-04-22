import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/studios/[id]/sources/search?q=keyword
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const query = q.trim();

    const chunks = await prisma.studioSourceChunk.findMany({
      where: {
        source: { studioId },
        content: { contains: query, mode: 'insensitive' },
      },
      include: {
        source: {
          select: { id: true, title: true, type: true },
        },
      },
      take: 50,
    });

    // Group results by source
    const groupedMap = new Map<
      string,
      {
        sourceId: string;
        sourceTitle: string;
        sourceType: string;
        matches: Array<{ chunkId: string; snippet: string }>;
      }
    >();

    for (const chunk of chunks) {
      const sourceId = chunk.source.id;
      if (!groupedMap.has(sourceId)) {
        groupedMap.set(sourceId, {
          sourceId,
          sourceTitle: chunk.source.title,
          sourceType: chunk.source.type,
          matches: [],
        });
      }

      const group = groupedMap.get(sourceId)!;

      // Build snippet: 50 chars before match + match + 50 chars after
      const lowerContent = chunk.content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const matchIdx = lowerContent.indexOf(lowerQuery);

      let snippet: string;
      if (matchIdx >= 0) {
        const start = Math.max(0, matchIdx - 50);
        const end = Math.min(chunk.content.length, matchIdx + query.length + 50);
        const prefix = start > 0 ? '...' : '';
        const suffix = end < chunk.content.length ? '...' : '';
        snippet = prefix + chunk.content.slice(start, end) + suffix;
      } else {
        snippet = chunk.content.slice(0, 100) + (chunk.content.length > 100 ? '...' : '');
      }

      // Limit to 3 matches per source for UI readability
      if (group.matches.length < 3) {
        group.matches.push({ chunkId: chunk.id, snippet });
      }
    }

    const results = Array.from(groupedMap.values()).slice(0, 20);

    return NextResponse.json({ results });
  } catch (error: unknown) {
    logger.error('Error searching sources', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
