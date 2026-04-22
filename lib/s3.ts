import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3-compatible storage (works with AWS S3, MinIO, Clever Cloud Cellar, etc.)
const S3_HOST = process.env.S3_HOST || process.env.CELLAR_ADDON_HOST;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.CELLAR_ADDON_KEY_ID;
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.CELLAR_ADDON_KEY_SECRET;

const s3Client = new S3Client({
  endpoint: S3_HOST ? `https://${S3_HOST}` : undefined,
  region: process.env.S3_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: S3_ACCESS_KEY!,
    secretAccessKey: S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'studio-library';

/**
 * Genere une cle S3 unique pour un document
 */
export function generateS3Key(filename: string, studioId: string, userId?: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const prefix = userId ? `users/${userId}` : 'anonymous';
  return `${prefix}/studios/${studioId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Upload a file to S3-compatible storage.
 */
export async function uploadToS3(
  file: Buffer | Blob,
  s3Key: string,
  contentType: string,
  options?: { publicRead?: boolean }
): Promise<{ s3Key: string; url: string }> {
  const body = file instanceof Blob ? Buffer.from(await file.arrayBuffer()) : file;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: contentType,
      ...(options?.publicRead && { ACL: 'public-read' }),
    })
  );

  const url = `https://${S3_HOST}/${BUCKET}/${s3Key}`;

  return { s3Key, url };
}

/**
 * Download a file from S3-compatible storage.
 */
export async function downloadFromS3(s3Key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    })
  );

  if (!response.Body) {
    throw new Error(`File not found: ${s3Key}`);
  }

  // Convertir le stream en Buffer
  const chunks: Uint8Array[] = [];
  const reader = response.Body.transformToWebStream().getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * Genere une URL presignee pour telechargement direct
 */
export async function getPresignedDownloadUrl(
  s3Key: string,
  expiresIn: number = 3600 // 1 heure par defaut
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Genere une URL presignee pour upload direct depuis le client
 */
export async function getPresignedUploadUrl(
  s3Key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Verifie si un fichier existe dans S3
 */
export async function fileExistsInS3(s3Key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Supprime un fichier de S3
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    })
  );
}

/**
 * Upload un fichier depuis une URL externe
 */
export async function uploadFromUrl(
  sourceUrl: string,
  s3Key: string,
  headers?: Record<string, string>
): Promise<{ s3Key: string; url: string; size: number }> {
  const response = await fetch(sourceUrl, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());

  const result = await uploadToS3(buffer, s3Key, contentType);

  return {
    ...result,
    size: buffer.length,
  };
}

export { s3Client, BUCKET };
