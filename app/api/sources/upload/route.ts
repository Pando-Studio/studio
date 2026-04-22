import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { uploadToS3, generateS3Key } from '@/lib/s3';
import { getSourceAnalysisQueue, type SourceAnalysisJob } from '@/lib/queue/queues';

// POST /api/sources/upload - Upload a document source
export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { userId } = ctx;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const studioId = formData.get('studioId') as string;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!studioId) {
      return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
    }

    // Verify studio ownership
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    if (studio.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Upload to S3
    const s3Key = generateS3Key(file.name, studioId, userId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToS3(buffer, s3Key, file.type);

    // Create source record
    const source = await prisma.studioSource.create({
      data: {
        studioId,
        type: 'DOCUMENT',
        title: title || file.name,
        url,
        s3Key,
        mimeType: file.type,
        size: file.size,
        status: 'PENDING',
      },
    });

    // Queue analysis job
    const queue = getSourceAnalysisQueue();
    const jobData: SourceAnalysisJob = {
      sourceId: source.id,
      studioId,
      filename: file.name,
      url,
      s3Key,
      type: 'DOCUMENT',
    };

    const job = await queue.add('analyze-source', jobData);

    return NextResponse.json({
      source,
      jobId: job.id,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error uploading source', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to upload source' }, { status: 500 });
  }
}
