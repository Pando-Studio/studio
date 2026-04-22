import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

/**
 * GET /api/settings/memory — list all memories for the authenticated user.
 */
export async function GET() {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const memories = await prisma.userMemory.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ memories });
  } catch (error: unknown) {
    logger.error('Error fetching user memories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/memory — delete a memory by ID.
 * Body: { memoryId: string }
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body: unknown = await request.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('memoryId' in body) ||
      typeof (body as Record<string, unknown>).memoryId !== 'string'
    ) {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 });
    }

    const { memoryId } = body as { memoryId: string };

    // Verify ownership
    const memory = await prisma.userMemory.findUnique({
      where: { id: memoryId },
      select: { userId: true },
    });

    if (!memory || memory.userId !== ctx.userId) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    await prisma.userMemory.delete({
      where: { id: memoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error deleting user memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/memory — update a memory's content.
 * Body: { memoryId: string, content: string }
 */
export async function PATCH(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body: unknown = await request.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('memoryId' in body) ||
      !('content' in body) ||
      typeof (body as Record<string, unknown>).memoryId !== 'string' ||
      typeof (body as Record<string, unknown>).content !== 'string'
    ) {
      return NextResponse.json(
        { error: 'memoryId and content are required' },
        { status: 400 },
      );
    }

    const { memoryId, content } = body as { memoryId: string; content: string };

    if (content.length === 0 || content.length > 1000) {
      return NextResponse.json(
        { error: 'Content must be between 1 and 1000 characters' },
        { status: 400 },
      );
    }

    // Verify ownership
    const memory = await prisma.userMemory.findUnique({
      where: { id: memoryId },
      select: { userId: true },
    });

    if (!memory || memory.userId !== ctx.userId) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const updated = await prisma.userMemory.update({
      where: { id: memoryId },
      data: { content },
    });

    return NextResponse.json({ memory: updated });
  } catch (error: unknown) {
    logger.error('Error updating user memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}
