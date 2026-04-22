import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { validateBody, createConversationSchema } from '@/lib/api/schemas';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/studios/[id]/conversations — List conversations
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const conversations = await prisma.conversation.findMany({
      where: { studioId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    logger.error('Error listing conversations', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 });
  }
}

// POST /api/studios/[id]/conversations — Create a new conversation
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(createConversationSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const conversation = await prisma.conversation.create({
      data: {
        studioId,
        title: validation.data.title || null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error: unknown) {
    logger.error('Error creating conversation', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
