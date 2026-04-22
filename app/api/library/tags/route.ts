import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

// GET - List tags
export async function GET() {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      // Anonymous users don't have tags - return empty
      return NextResponse.json({ tags: [] });
    }

    const tags = await prisma.documentTag.findMany({
      where: { userId: ctx.userId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sources: true } },
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    logger.error('Error fetching tags', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a tag
export async function POST(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { name, color } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.documentTag.findUnique({
      where: { userId_name: { userId: ctx.userId, name: name.trim() } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ce tag existe deja' }, { status: 409 });
    }

    const tag = await prisma.documentTag.create({
      data: {
        userId: ctx.userId,
        name: name.trim(),
        color: color || '#6B7280',
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    logger.error('Error creating tag', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete a tag
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const tag = await prisma.documentTag.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!tag) {
      return NextResponse.json({ error: 'Tag introuvable' }, { status: 404 });
    }

    // Cascade will delete DocumentTagSource entries
    await prisma.documentTag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting tag', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
