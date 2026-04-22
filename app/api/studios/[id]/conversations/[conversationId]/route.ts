import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { validateBody, renameConversationSchema } from '@/lib/api/schemas';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string; conversationId: string }> };

// GET /api/studios/[id]/conversations/[conversationId] — Get conversation with messages
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, conversationId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, studioId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error: unknown) {
    logger.error('Error fetching conversation', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// PATCH /api/studios/[id]/conversations/[conversationId] — Rename conversation
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, conversationId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(renameConversationSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const conversation = await prisma.conversation.updateMany({
      where: { id: conversationId, studioId },
      data: { title: validation.data.title },
    });

    if (conversation.count === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error renaming conversation', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to rename conversation' }, { status: 500 });
  }
}

// DELETE /api/studios/[id]/conversations/[conversationId] — Delete conversation
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, conversationId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const result = await prisma.conversation.deleteMany({
      where: { id: conversationId, studioId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error deleting conversation', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
