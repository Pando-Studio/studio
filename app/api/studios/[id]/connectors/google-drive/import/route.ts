import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { downloadFile } from '@/lib/connectors/google-drive';
import { uploadToS3, generateS3Key } from '@/lib/s3';
import { logger } from '@/lib/monitoring/logger';
import { getSourceAnalysisQueue } from '@/lib/queue/queues';
import type { SourceAnalysisJob } from '@/lib/queue/queues';

interface ImportRequestBody {
  fileId: string;
  fileName: string;
}

function getSourceType(mimeType: string): 'DOCUMENT' | 'AUDIO' | 'VIDEO' {
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

/**
 * POST /api/studios/:id/connectors/google-drive/import
 *
 * Downloads a file from Google Drive and imports it as a StudioSource.
 * Body: { fileId: string, fileName: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: studioId } = await params;

    // --- Auth ---
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify studio ownership
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { userId: true },
    });

    if (!studio || studio.userId !== userId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // --- Retrieve Google access token ---
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId,
        providerId: 'google',
      },
      select: {
        accessToken: true,
      },
    });

    if (!googleAccount?.accessToken) {
      return NextResponse.json(
        { error: 'No Google account linked. Please sign in with Google first.' },
        { status: 403 },
      );
    }

    // --- Parse body ---
    const body = (await request.json()) as ImportRequestBody;
    const { fileId, fileName } = body;

    if (!fileId || !fileName) {
      return NextResponse.json(
        { error: 'fileId and fileName are required' },
        { status: 400 },
      );
    }

    // --- Download file from Drive ---
    const { buffer, mimeType, filename } = await downloadFile(
      googleAccount.accessToken,
      fileId,
    );

    // --- Upload to S3 ---
    const s3Key = generateS3Key(filename, studioId, userId);
    const { url: s3Url } = await uploadToS3(buffer, s3Key, mimeType);

    const sourceType = getSourceType(mimeType);

    // --- Check for duplicate (same title in same studio) ---
    const existingSource = await prisma.studioSource.findFirst({
      where: { studioId, title: filename },
    });

    if (existingSource) {
      // Re-use existing source: clear old chunks and update
      await prisma.studioSourceChunk.deleteMany({
        where: { sourceId: existingSource.id },
      });
      await prisma.studioSource.update({
        where: { id: existingSource.id },
        data: {
          url: s3Url,
          s3Key,
          mimeType,
          size: buffer.length,
          status: 'PENDING',
          type: sourceType,
          metadata: { source: 'GOOGLE_DRIVE', originalFilename: filename, driveFileId: fileId },
        },
      });

      await enqueueAnalysis(existingSource.id, studioId, filename, s3Url, s3Key, sourceType);

      return NextResponse.json({
        sourceId: existingSource.id,
        studioId,
        status: 'PENDING',
        replaced: true,
      });
    }

    // --- Create new StudioSource ---
    const source = await prisma.studioSource.create({
      data: {
        studioId,
        type: sourceType,
        title: filename,
        url: s3Url,
        s3Key,
        mimeType,
        size: buffer.length,
        status: 'PENDING',
        metadata: { source: 'GOOGLE_DRIVE', originalFilename: filename, driveFileId: fileId },
      },
    });

    await enqueueAnalysis(source.id, studioId, filename, s3Url, s3Key, sourceType);

    return NextResponse.json(
      {
        sourceId: source.id,
        studioId,
        status: 'PENDING',
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Google Drive import error', { error: message });

    if (message.includes('401') || message.includes('403')) {
      return NextResponse.json(
        { error: 'Google Drive access denied. Token may have expired or lacks the drive.readonly scope.' },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to import file from Google Drive' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function enqueueAnalysis(
  sourceId: string,
  studioId: string,
  filename: string,
  url: string,
  s3Key: string,
  sourceType: 'DOCUMENT' | 'AUDIO' | 'VIDEO',
): Promise<void> {
  try {
    const queue = getSourceAnalysisQueue();
    await queue.add(
      'analyze-source',
      {
        sourceId,
        studioId,
        filename,
        url,
        s3Key,
        type: sourceType,
      } satisfies SourceAnalysisJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  } catch (queueError) {
    logger.warn('Failed to enqueue source analysis for Drive import, marking as INDEXED', {
      error: queueError instanceof Error ? queueError.message : String(queueError),
    });
    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { status: 'INDEXED' },
    });
  }
}
