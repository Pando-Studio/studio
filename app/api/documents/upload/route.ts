import { NextResponse } from 'next/server';
import { prisma, type StudioSourceType } from '@/lib/db';
import { uploadToS3, generateS3Key, uploadFromUrl } from '@/lib/s3';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getSourceAnalysisQueue } from '@/lib/queue/queues';
import type { SourceAnalysisJob } from '@/lib/queue/queues';

const ALLOWED_TYPES = [
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/octet-stream', // fallback for .md, .txt, etc. when browser can't detect type
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

/** Resolve actual type from filename when browser sends application/octet-stream */
function resolveFileType(filename: string, browserType: string): string {
  if (browserType !== 'application/octet-stream') return browserType;
  const ext = filename.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    md: 'text/markdown',
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
    json: 'application/json',
    pdf: 'application/pdf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return extMap[ext ?? ''] ?? browserType;
}

function getSourceType(mimeType: string): StudioSourceType {
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

type DocumentSource = 'LOCAL' | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'URL';

interface UploadRequest {
  file?: File;
  studioId?: string;
  source?: DocumentSource;
  cloudFileUrl?: string;
  cloudFileId?: string;
  accessToken?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export async function POST(request: Request) {
  try {
    const authCtx = await getUserAuthContext();
    if ('error' in authCtx) {
      return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
    }
    const { userId } = authCtx;

    const contentType = request.headers.get('content-type') || '';

    let uploadData: UploadRequest;

    if (contentType.includes('multipart/form-data')) {
      // Upload de fichier local
      const formData = await request.formData();
      uploadData = {
        file: formData.get('file') as File | undefined,
        studioId: formData.get('studioId') as string | undefined,
        source: (formData.get('source') as DocumentSource) || 'LOCAL',
      };
    } else {
      // Upload depuis le cloud (JSON body)
      uploadData = await request.json();
    }

    const { file, studioId, source = 'LOCAL', cloudFileUrl, filename, mimeType } = uploadData;

    // Validation basique
    if (!file && !cloudFileUrl) {
      logger.warn('Upload rejected: no file or cloudFileUrl', { source, studioId });
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    if (file) {
      logger.info('Upload received', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        source,
        studioId,
      });
    }

    let fileBuffer: Buffer;
    let finalFilename: string;
    let finalMimeType: string;
    let finalSize: number;
    let s3Key: string;
    let s3Url: string;

    // On a besoin d'un studio pour stocker le document
    // Si pas de studioId, on cree ou recupere un studio "bibliotheque"
    let targetStudioId = studioId;

    if (!targetStudioId) {
      // Chercher ou creer un studio "Bibliotheque" pour l'utilisateur
      const existingStudio = await prisma.studio.findFirst({
        where: { userId, title: 'Bibliotheque' },
      });

      if (existingStudio) {
        targetStudioId = existingStudio.id;
      } else {
        const newStudio = await prisma.studio.create({
          data: {
            title: 'Bibliotheque',
            description: 'Documents importes',
            userId,
          },
        });
        targetStudioId = newStudio.id;
      }
    }

    if (file) {
      // Resolve actual mime type from extension when browser sends octet-stream
      const resolvedType = resolveFileType(file.name, file.type);

      // Upload local
      if (!ALLOWED_TYPES.includes(resolvedType)) {
        logger.warn('Upload rejected: unsupported file type', { fileType: file.type, fileName: file.name });
        return NextResponse.json(
          { error: `Type de fichier non supporte: ${file.type || '(vide)'}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Fichier trop volumineux (max 100MB)' },
          { status: 400 }
        );
      }

      finalFilename = file.name;
      finalMimeType = resolvedType;
      finalSize = file.size;
      fileBuffer = Buffer.from(await file.arrayBuffer());

      // Upload vers S3 Cellar
      s3Key = generateS3Key(finalFilename, targetStudioId, userId);
      const result = await uploadToS3(fileBuffer, s3Key, finalMimeType);
      s3Url = result.url;
    } else if (cloudFileUrl) {
      // Upload depuis cloud (Google Drive, OneDrive, Dropbox, etc.)
      if (!filename || !mimeType) {
        return NextResponse.json(
          { error: 'Filename et mimeType requis pour les fichiers cloud' },
          { status: 400 }
        );
      }

      finalFilename = filename;
      finalMimeType = mimeType;
      s3Key = generateS3Key(finalFilename, targetStudioId, userId);

      // Telecharger depuis l'URL cloud et uploader vers S3
      const result = await uploadFromUrl(
        cloudFileUrl,
        s3Key,
        uploadData.accessToken
          ? { Authorization: `Bearer ${uploadData.accessToken}` }
          : undefined
      );
      s3Url = result.url;
      finalSize = result.size;
    } else {
      return NextResponse.json(
        { error: 'Donnees de fichier invalides' },
        { status: 400 }
      );
    }

    // Determine source type based on mimeType
    const sourceType = getSourceType(finalMimeType);

    // Check for duplicate (same filename in same studio)
    const existingSource = await prisma.studioSource.findFirst({
      where: {
        studioId: targetStudioId,
        title: finalFilename,
      },
    });

    if (existingSource) {
      // Delete old chunks and re-use the existing source
      await prisma.studioSourceChunk.deleteMany({
        where: { sourceId: existingSource.id },
      });
      await prisma.studioSource.update({
        where: { id: existingSource.id },
        data: {
          url: s3Url,
          s3Key,
          mimeType: finalMimeType,
          size: finalSize!,
          status: 'PENDING',
          type: sourceType,
          metadata: { source, originalFilename: finalFilename },
        },
      });

      // Enqueue re-indexation
      try {
        const queue = getSourceAnalysisQueue();
        await queue.add(
          'analyze-source',
          {
            sourceId: existingSource.id,
            studioId: targetStudioId,
            filename: finalFilename,
            url: s3Url,
            s3Key,
            type: sourceType === 'AUDIO' ? 'AUDIO' : sourceType === 'VIDEO' ? 'VIDEO' : 'DOCUMENT',
          } satisfies SourceAnalysisJob,
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
        );
      } catch (queueError) {
        logger.warn('Failed to enqueue source analysis job for re-upload', { error: queueError instanceof Error ? queueError : String(queueError) });
        await prisma.studioSource.update({
          where: { id: existingSource.id },
          data: { status: 'INDEXED' },
        });
      }

      return NextResponse.json(
        {
          documentId: existingSource.id,
          studioId: targetStudioId,
          status: 'PENDING',
          url: s3Url,
          replaced: true,
        },
        { status: 200 }
      );
    }

    // Creer le StudioSource en base
    const studioSource = await prisma.studioSource.create({
      data: {
        studioId: targetStudioId,
        type: sourceType,
        title: finalFilename,
        url: s3Url,
        s3Key,
        mimeType: finalMimeType,
        size: finalSize!,
        status: 'PENDING',
        metadata: {
          source,
          originalFilename: finalFilename,
        },
      },
    });

    // Enqueue BullMQ job for indexation (chunks + embeddings)
    try {
      const queue = getSourceAnalysisQueue();
      await queue.add(
        'analyze-source',
        {
          sourceId: studioSource.id,
          studioId: targetStudioId,
          filename: finalFilename,
          url: s3Url,
          s3Key,
          type: sourceType === 'AUDIO' ? 'AUDIO' : sourceType === 'VIDEO' ? 'VIDEO' : 'DOCUMENT',
        } satisfies SourceAnalysisJob,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    } catch (queueError) {
      logger.warn('Failed to enqueue source analysis job, marking as INDEXED', { error: queueError instanceof Error ? queueError : String(queueError) });
      // Fallback: mark as INDEXED if queue is not available (dev mode)
      await prisma.studioSource.update({
        where: { id: studioSource.id },
        data: { status: 'INDEXED' },
      });
    }

    return NextResponse.json(
      {
        documentId: studioSource.id,
        studioId: targetStudioId,
        status: 'PENDING',
        url: s3Url,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error uploading document', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du document' },
      { status: 500 }
    );
  }
}
