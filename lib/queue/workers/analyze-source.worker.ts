import { Worker, Job } from 'bullmq';
import { prisma } from '@/lib/db';
import { connectionOptions } from '../connection';
import type { SourceAnalysisJob, SourceAnalysisResult } from '../queues';
import { downloadFromS3 } from '../../s3';
import { smartParseDocument, structureAwareChunk, chunkText } from '../../unstructured';
import { generateEmbeddings, embeddingToVector } from '../../ai/embeddings';
import { transcribeAudio, describeImage } from '../../ai/transcription';

async function processSourceAnalysis(
  job: Job<SourceAnalysisJob>
): Promise<SourceAnalysisResult> {
  const { sourceId, studioId, filename, url, s3Key, type } = job.data;

  console.log(`[SourceWorker] Processing source ${sourceId} (${type}): ${filename}`);

  try {
    // Update status to INDEXING
    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { status: 'INDEXING' },
    });

    await job.updateProgress(10);

    let chunks: Array<{ text: string; metadata: Record<string, unknown> }> = [];

    if (type === 'DOCUMENT') {
      // Download file from S3
      if (!s3Key) {
        throw new Error('S3 key is required for document sources');
      }

      console.log(`[SourceWorker] Downloading from S3: ${s3Key}`);
      const fileBuffer = await downloadFromS3(s3Key);
      await job.updateProgress(20);

      // Check if it's an image file
      const source = await prisma.studioSource.findUnique({
        where: { id: sourceId },
        select: { mimeType: true },
      });
      const mimeType = source?.mimeType || '';

      if (mimeType.startsWith('image/')) {
        // Use vision model to describe the image
        console.log(`[SourceWorker] Describing image: ${filename}`);
        const description = await describeImage(fileBuffer, filename);
        await job.updateProgress(40);

        const chunkedTexts = chunkText(description, { chunkSize: 1000, chunkOverlap: 200 });
        chunks = chunkedTexts.map((t, i) => ({
          text: t,
          metadata: { filename, type: 'image', chunk_index: i },
        }));
      } else {
        // Parse document with Unstructured, then use structure-aware chunking
        console.log(`[SourceWorker] Parsing document: ${filename}`);
        const rawElements = await smartParseDocument(fileBuffer, filename);
        await job.updateProgress(30);

        // Structure-aware chunking: respects titles, tables, sections
        console.log(`[SourceWorker] Structure-aware chunking: ${rawElements.length} elements`);
        const structuredChunks = structureAwareChunk(rawElements, {
          maxChunkSize: 1500,
          chunkOverlap: 200,
        });
        await job.updateProgress(40);

        chunks = structuredChunks.map((c) => ({
          text: c.text,
          metadata: c.metadata,
        }));
        console.log(`[SourceWorker] Created ${chunks.length} structure-aware chunks`);
      }
    } else if (type === 'AUDIO' || type === 'VIDEO') {
      // Download file from S3
      if (!s3Key) {
        throw new Error('S3 key is required for audio/video sources');
      }

      console.log(`[SourceWorker] Downloading ${type.toLowerCase()} from S3: ${s3Key}`);
      const fileBuffer = await downloadFromS3(s3Key);
      await job.updateProgress(20);

      // Transcribe using Whisper API (supports both audio and video files)
      console.log(`[SourceWorker] Transcribing ${type.toLowerCase()}: ${filename}`);
      const transcript = await transcribeAudio(fileBuffer, filename);
      await job.updateProgress(40);

      if (!transcript || transcript.trim().length === 0) {
        throw new Error(`No transcript extracted from ${type.toLowerCase()} file`);
      }

      const chunkedTexts = chunkText(transcript, { chunkSize: 1000, chunkOverlap: 200 });
      chunks = chunkedTexts.map((t, i) => ({
        text: t,
        metadata: { filename, type: type.toLowerCase(), chunk_index: i },
      }));
    } else if (type === 'WEB') {
      // Fetch web page content
      console.log(`[SourceWorker] Fetching URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();
      // Simple HTML to text conversion (in production, use a proper parser)
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      await job.updateProgress(30);

      const chunkedTexts = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });
      chunks = chunkedTexts.map((t, i) => ({
        text: t,
        metadata: { url, chunk_index: i },
      }));

      await job.updateProgress(40);
    } else if (type === 'YOUTUBE') {
      // Extract transcript from YouTube video
      console.log(`[SourceWorker] Extracting YouTube transcript: ${url}`);

      try {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcriptItems = await YoutubeTranscript.fetchTranscript(url, { lang: 'fr' });

        if (!transcriptItems || transcriptItems.length === 0) {
          // Fallback: try without language preference
          const fallbackItems = await YoutubeTranscript.fetchTranscript(url);
          if (!fallbackItems || fallbackItems.length === 0) {
            throw new Error('No transcript available for this video');
          }
          const fullText = fallbackItems.map((item) => item.text).join(' ');
          await job.updateProgress(30);

          const chunkedTexts = chunkText(fullText, { chunkSize: 1000, chunkOverlap: 200 });
          chunks = chunkedTexts.map((t, i) => ({
            text: t,
            metadata: { url, type: 'youtube', chunk_index: i },
          }));
        } else {
          const fullText = transcriptItems.map((item) => item.text).join(' ');
          await job.updateProgress(30);

          const chunkedTexts = chunkText(fullText, { chunkSize: 1000, chunkOverlap: 200 });
          chunks = chunkedTexts.map((t, i) => ({
            text: t,
            metadata: { url, type: 'youtube', chunk_index: i },
          }));
        }
      } catch (transcriptError) {
        console.warn(`[SourceWorker] YouTube transcript extraction failed:`, transcriptError);
        // Fallback: store URL with minimal info
        chunks = [
          {
            text: `YouTube video: ${url}. Transcript not available.`,
            metadata: { url, type: 'youtube', error: 'transcript_unavailable' },
          },
        ];
      }

      await job.updateProgress(40);
    }

    if (chunks.length === 0) {
      throw new Error('No content extracted from source');
    }

    // Generate embeddings
    console.log(`[SourceWorker] Generating embeddings for ${chunks.length} chunks`);
    const textsForEmbedding = chunks.map((c) => c.text);
    const embeddingResults = await generateEmbeddings(textsForEmbedding, studioId);
    await job.updateProgress(70);

    // Save chunks with embeddings
    console.log(`[SourceWorker] Saving ${chunks.length} chunks to database`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddingResults[i]?.embedding;

      if (embedding) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO studio_source_chunks (id, "sourceId", content, embedding, metadata, "chunkIndex", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            $1,
            $2,
            $3::vector,
            $4::jsonb,
            $5,
            NOW()
          )
        `, sourceId, chunk.text, embeddingToVector(embedding), JSON.stringify(chunk.metadata), i);
      }
    }

    await job.updateProgress(90);

    // Update source status to INDEXED
    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { status: 'INDEXED' },
    });

    await job.updateProgress(100);

    console.log(`[SourceWorker] Successfully processed source ${sourceId}`);

    return {
      success: true,
      sourceId,
      chunksCount: chunks.length,
    };
  } catch (error) {
    console.error(`[SourceWorker] Error processing source ${sourceId}:`, error);

    // Update source status to ERROR
    await prisma.studioSource.update({
      where: { id: sourceId },
      data: {
        status: 'ERROR',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    return {
      success: false,
      sourceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function createSourceAnalysisWorker() {
  const worker = new Worker<SourceAnalysisJob, SourceAnalysisResult>(
    'studio-source-analysis',
    processSourceAnalysis,
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[SourceWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SourceWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
