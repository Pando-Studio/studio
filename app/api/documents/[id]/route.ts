import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { deleteFromS3 } from '@/lib/s3';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authCtx = await getAuthContext();
    if ('error' in authCtx) {
      return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
    }
    const { userId } = authCtx;

    // Recuperer le document (StudioSource)
    const source = await prisma.studioSource.findUnique({
      where: { id },
      include: {
        studio: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Document non trouve' },
        { status: 404 }
      );
    }

    // Verifier l'ownership
    if (source.studio.userId !== userId) {
      return NextResponse.json(
        { error: 'Acces non autorise' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: source.id,
      filename: source.title,
      mimeType: source.mimeType,
      size: source.size,
      status: source.status,
      url: source.url,
      createdAt: source.createdAt.toISOString(),
      chunksCount: source._count.chunks,
      studioId: source.studioId,
    });
  } catch (error) {
    logger.error('Error fetching document', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation du document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authCtx = await getAuthContext();
    if ('error' in authCtx) {
      return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
    }
    const { userId } = authCtx;

    // Recuperer le document (StudioSource)
    const source = await prisma.studioSource.findUnique({
      where: { id },
      include: {
        studio: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Document non trouve' },
        { status: 404 }
      );
    }

    // Verifier l'ownership
    if (source.studio.userId !== userId) {
      return NextResponse.json(
        { error: 'Acces non autorise' },
        { status: 403 }
      );
    }

    // Supprimer le fichier de S3 si existe
    if (source.s3Key) {
      try {
        await deleteFromS3(source.s3Key);
      } catch (s3Error) {
        logger.error('Error deleting from S3', { error: s3Error instanceof Error ? s3Error : String(s3Error) });
        // Continue avec la suppression en base meme si S3 echoue
      }
    }

    // Supprimer le document (les chunks sont supprimes en cascade)
    await prisma.studioSource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting document', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    );
  }
}
