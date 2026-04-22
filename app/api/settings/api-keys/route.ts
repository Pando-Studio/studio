import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { hashApiKey } from '@/lib/api/api-key-auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * GET /api/settings/api-keys
 * List the current user's API keys (prefix + name + metadata only).
 */
export async function GET() {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error: unknown) {
    logger.error('Failed to list API keys', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/api-keys
 * Create a new API key. Returns the full key ONCE in the response.
 * Body: { name: string, expiresInDays?: number }
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'name is required (1-100 characters)' },
        { status: 400 },
      );
    }

    // Generate a random key: sk_ + 32 random bytes hex = 68 chars total
    const rawBytes = randomBytes(32).toString('hex');
    const fullKey = `sk_${rawBytes}`;
    const keyHash = hashApiKey(fullKey);
    const keyPrefix = fullKey.slice(0, 11); // "sk_" + 8 hex chars

    // Optional expiration
    let expiresAt: Date | null = null;
    if (typeof body.expiresInDays === 'number' && body.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: ctx.userId,
        name,
        keyHash,
        keyPrefix,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the full key ONLY at creation time
    return NextResponse.json({
      ...apiKey,
      key: fullKey,
      warning: 'Store this key securely. It will not be shown again.',
    });
  } catch (error: unknown) {
    logger.error('Failed to create API key', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/api-keys
 * Delete an API key by ID.
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Ensure the key belongs to the current user
    const existing = await prisma.apiKey.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== ctx.userId) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    logger.error('Failed to delete API key', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 },
    );
  }
}
