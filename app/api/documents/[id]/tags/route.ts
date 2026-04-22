import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Add a tag to a document
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { id: sourceId } = await params;
    const { tagId } = await request.json();

    if (!tagId) {
      return NextResponse.json({ error: 'tagId requis' }, { status: 400 });
    }

    // Verify tag belongs to user
    const tag = await prisma.documentTag.findFirst({
      where: { id: tagId, userId: ctx.userId },
    });
    if (!tag) {
      return NextResponse.json({ error: 'Tag introuvable' }, { status: 404 });
    }

    // Check if already tagged
    const existing = await prisma.documentTagSource.findUnique({
      where: { tagId_sourceId: { tagId, sourceId } },
    });
    if (existing) {
      return NextResponse.json({ message: 'Tag deja applique' });
    }

    await prisma.documentTagSource.create({
      data: { tagId, sourceId },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('Error adding tag to document', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Remove a tag from a document
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { id: sourceId } = await params;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'tagId requis' }, { status: 400 });
    }

    // Verify tag belongs to user
    const tag = await prisma.documentTag.findFirst({
      where: { id: tagId, userId: ctx.userId },
    });
    if (!tag) {
      return NextResponse.json({ error: 'Tag introuvable' }, { status: 404 });
    }

    await prisma.documentTagSource.deleteMany({
      where: { tagId, sourceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error removing tag from document', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
