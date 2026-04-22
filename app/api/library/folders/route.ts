import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

// GET - List folders (tree structure)
export async function GET() {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      // Anonymous users don't have folders - return empty
      return NextResponse.json({ folders: [] });
    }

    const folders = await prisma.documentFolder.findMany({
      where: { userId: ctx.userId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sources: true } },
      },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    logger.error('Error fetching folders', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a folder
export async function POST(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { name, parentId, color } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    // Validate parent folder if provided
    if (parentId) {
      const parent = await prisma.documentFolder.findFirst({
        where: { id: parentId, userId: ctx.userId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Dossier parent introuvable' }, { status: 404 });
      }
    }

    const folder = await prisma.documentFolder.create({
      data: {
        userId: ctx.userId,
        name: name.trim(),
        parentId: parentId || null,
        color: color || null,
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    logger.error('Error creating folder', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Update a folder
export async function PATCH(request: Request) {
  try {
    const ctx = await getUserAuthContext();
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { id, name, parentId, color } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const folder = await prisma.documentFolder.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!folder) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    // Prevent circular references
    if (parentId === id) {
      return NextResponse.json({ error: 'Un dossier ne peut pas etre son propre parent' }, { status: 400 });
    }

    const updated = await prisma.documentFolder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(color !== undefined && { color: color || null }),
      },
    });

    return NextResponse.json({ folder: updated });
  } catch (error) {
    logger.error('Error updating folder', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete a folder (sources go back to root)
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

    const folder = await prisma.documentFolder.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!folder) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    // Move sources back to root before deleting
    await prisma.studioSource.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });

    // Move child folders to parent
    await prisma.documentFolder.updateMany({
      where: { parentId: id },
      data: { parentId: folder.parentId },
    });

    await prisma.documentFolder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting folder', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
