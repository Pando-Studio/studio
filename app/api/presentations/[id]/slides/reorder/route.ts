import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getPresentationAuthContext } from '@/lib/api/auth-context';

// POST /api/presentations/[id]/slides/reorder - Reorder slides
const ReorderSlidesSchema = z.object({
  slideIds: z.array(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: presentationId } = await params;

    const authResult = await getPresentationAuthContext(presentationId);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();

    const validationResult = ReorderSlidesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { slideIds } = validationResult.data;

    // Verify presentation exists
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!presentation || presentation.versions.length === 0) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    // Update order for each slide
    const updates = slideIds.map((slideId, index) =>
      prisma.slide.update({
        where: { id: slideId },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering slides:', error);
    return NextResponse.json(
      { error: 'Failed to reorder slides' },
      { status: 500 }
    );
  }
}
