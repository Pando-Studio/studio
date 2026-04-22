import { createHash } from 'crypto';
import { prisma } from '@/lib/db';

export interface ApiKeyAuthSuccess {
  userId: string;
}

export interface ApiKeyAuthError {
  error: string;
  status: number;
}

/**
 * Hash an API key using SHA-256.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Authenticate a request using an API key from the Authorization header.
 * Expects `Authorization: Bearer sk_...`
 *
 * On success, updates `lastUsedAt` and returns the userId.
 * On failure, returns an error object with HTTP status.
 */
export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyAuthSuccess | ApiKeyAuthError> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Missing Authorization header', status: 401 };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { error: 'Invalid Authorization header format. Expected: Bearer sk_...', status: 401 };
  }

  const key = parts[1];
  if (!key.startsWith('sk_')) {
    return { error: 'Invalid API key format. Keys must start with sk_', status: 401 };
  }

  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!apiKey) {
    return { error: 'Invalid API key', status: 401 };
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { error: 'API key has expired', status: 401 };
  }

  // Update lastUsedAt in the background (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Silently ignore update failures — non-critical
    });

  return { userId: apiKey.userId };
}
