import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Move document to a folder (or root with folderId: null)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { id: sourceId } = await params;
    const { folderId } = await request.json();

    // Verify source exists
    const source = await prisma.studioSource.findUnique({
      where: { id: sourceId },
      include: { studio: { select: { userId: true } } },
    });
    if (!source) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }
    if (source.studio.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    // Verify folder if provided
    if (folderId) {
      const folder = await prisma.documentFolder.findFirst({
        where: { id: folderId, userId: session.user.id },
      });
      if (!folder) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
      }
    }

    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { folderId: folderId || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error moving document to folder:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
