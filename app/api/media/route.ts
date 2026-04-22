import { NextRequest, NextResponse } from 'next/server';
import { getPresignedDownloadUrl } from '@/lib/s3';

/**
 * GET /api/media?url=https://cellar-c2.../bucket/key
 *
 * Redirects to a presigned S3 URL for private media files (audio, video, images).
 * Extracts the S3 key from the full Cellar URL and generates a 1-hour presigned URL.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Extract S3 key from full URL: https://host/bucket/key → key
  const bucket = process.env.S3_BUCKET || 'studio-library';
  const bucketIndex = url.indexOf(`/${bucket}/`);
  if (bucketIndex === -1) {
    return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
  }

  const s3Key = url.substring(bucketIndex + `/${bucket}/`.length);

  try {
    const presignedUrl = await getPresignedDownloadUrl(s3Key, 3600);
    return NextResponse.redirect(presignedUrl);
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
