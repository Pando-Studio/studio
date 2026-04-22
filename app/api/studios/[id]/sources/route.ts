import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getSourceAnalysisQueue, type SourceAnalysisJob } from '@/lib/queue/queues';
import { validateBody, addSourceSchema } from '@/lib/api/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Liste des sources d'un studio
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Recuperer les sources
    const sources = await prisma.studioSource.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    logger.error('Error fetching studio sources', { studioId: (await params).id, error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des sources' },
      { status: 500 }
    );
  }
}

// POST - Ajouter une source a un studio
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    const body = await request.json();
    const validation = validateBody(addSourceSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const validData = validation.data;
    const documentId = 'documentId' in validData ? validData.documentId : undefined;
    const type = 'type' in validData ? validData.type : undefined;
    const url = 'url' in validData ? validData.url : undefined;
    const title = 'title' in validData ? validData.title : undefined;

    let newSource;

    if (documentId) {
      // Ajouter depuis un document existant
      // Recuperer le document source (qui est aussi un StudioSource)
      const existingSource = await prisma.studioSource.findUnique({
        where: { id: documentId },
      });

      if (!existingSource) {
        return NextResponse.json(
          { error: 'Document non trouve' },
          { status: 404 }
        );
      }

      // Verifier que le document appartient a l'utilisateur
      const sourceStudio = await prisma.studio.findUnique({
        where: { id: existingSource.studioId },
      });

      if (!sourceStudio) {
        return NextResponse.json(
          { error: 'Studio source non trouve' },
          { status: 404 }
        );
      }

      const isSourceOwner = sourceStudio.userId === userId;

      if (!isSourceOwner) {
        return NextResponse.json(
          { error: 'Vous n\'avez pas acces a ce document' },
          { status: 403 }
        );
      }

      // Si le document est deja dans ce studio, ne pas le dupliquer
      const existingInStudio = await prisma.studioSource.findFirst({
        where: {
          studioId,
          url: existingSource.url,
        },
      });

      if (existingInStudio) {
        return NextResponse.json({
          source: existingInStudio,
          message: 'Document deja present dans ce studio',
        });
      }

      // Creer une nouvelle source referençant le meme fichier
      newSource = await prisma.studioSource.create({
        data: {
          studioId,
          type: existingSource.type,
          title: existingSource.title,
          url: existingSource.url,
          s3Key: existingSource.s3Key,
          mimeType: existingSource.mimeType,
          size: existingSource.size,
          status: existingSource.status,
          metadata: existingSource.metadata || {},
        },
      });

      // Copy chunks from the original source so the new source has content
      const originalChunks = await prisma.studioSourceChunk.findMany({
        where: { sourceId: documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      if (originalChunks.length > 0) {
        // Use raw SQL to copy chunks efficiently (preserves vector embeddings)
        for (const chunk of originalChunks) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO studio_source_chunks (id, "sourceId", content, embedding, metadata, "chunkIndex", "createdAt")
             SELECT gen_random_uuid()::text, $1, content, embedding, metadata, "chunkIndex", NOW()
             FROM studio_source_chunks WHERE id = $2`,
            newSource.id,
            chunk.id
          );
        }
        logger.source('copied chunks', { studioId, sourceId: newSource.id, chunkCount: originalChunks.length });
      } else {
        logger.source('original source has 0 chunks', { studioId, sourceId: documentId });
      }
    } else if (type === 'WEB' || type === 'YOUTUBE') {
      // Ajouter une source web ou YouTube
      // Zod union guarantees url and title are present when type is WEB/YOUTUBE
      newSource = await prisma.studioSource.create({
        data: {
          studioId,
          type,
          title: title!,
          url: url!,
          status: 'PENDING',
        },
      });

      // Enqueue BullMQ job for indexation
      try {
        const queue = getSourceAnalysisQueue();
        await queue.add(
          'analyze-source',
          {
            sourceId: newSource.id,
            studioId,
            filename: title!,
            url: url!,
            type,
          } satisfies SourceAnalysisJob,
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );
      } catch (queueError) {
        logger.warn('Failed to enqueue source analysis job', { studioId, error: queueError instanceof Error ? queueError : String(queueError) });
      }
    } else {
      return NextResponse.json(
        { error: 'Type de source invalide' },
        { status: 400 }
      );
    }

    return NextResponse.json({ source: newSource }, { status: 201 });
  } catch (error) {
    logger.error('Error adding studio source', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de la source' },
      { status: 500 }
    );
  }
}
