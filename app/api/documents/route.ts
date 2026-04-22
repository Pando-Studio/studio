import { NextResponse } from 'next/server';
import { prisma, type Prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

export async function GET(request: Request) {
  try {
    const authCtx = await getAuthContext();
    if ('error' in authCtx) {
      return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
    }
    const { userId } = authCtx;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const folderId = searchParams.get('folderId');
    const tagId = searchParams.get('tagId');
    const type = searchParams.get('type'); // DOCUMENT | AUDIO | VIDEO | WEB | YOUTUBE | WIDGET

    // Get user studios
    const studios = await prisma.studio.findMany({
      where: { userId },
      select: { id: true },
    });

    const studioIds = studios.map((s) => s.id);

    // Build where clause
    const where: Prisma.StudioSourceWhereInput = {
      studioId: { in: studioIds },
    };

    // Filter by type
    if (type && type !== 'all') {
      where.type = type as unknown as Prisma.EnumStudioSourceTypeFilter;
    }

    // Filter by folder
    if (folderId === 'none') {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }

    // Filter by tag
    if (tagId) {
      where.tags = { some: { tagId } };
    }

    // Search by title
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const sources = await prisma.studioSource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Formater la reponse
    const formattedDocuments = sources.map((source) => ({
      id: source.id,
      filename: source.title,
      mimeType: source.mimeType || 'application/octet-stream',
      size: source.size || 0,
      status: source.status,
      type: source.type,
      source: (source.metadata as Record<string, unknown>)?.source || 'LOCAL',
      createdAt: source.createdAt.toISOString(),
      chunksCount: source._count.chunks,
      studioId: source.studioId,
      folderId: source.folderId,
      tags: source.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
    }));

    return NextResponse.json({ documents: formattedDocuments });
  } catch (error) {
    logger.error('Error fetching documents', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des documents' },
      { status: 500 }
    );
  }
}
