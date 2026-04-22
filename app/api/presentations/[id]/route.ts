import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getPresentationAuthContext } from '@/lib/api/auth-context';

// GET /api/presentations/[id] - Get a presentation with its slides
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: presentationId } = await params;

    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        studio: {
          select: {
            id: true,
            title: true,
          },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            slides: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    const latestVersion = presentation.versions[0];

    return NextResponse.json({
      presentation: {
        id: presentation.id,
        title: presentation.title,
        studioId: presentation.studio.id,
        studioTitle: presentation.studio.title,
        createdAt: presentation.createdAt,
        updatedAt: presentation.updatedAt,
        status: latestVersion?.status || 'DRAFT',
        version: latestVersion?.version || 1,
        slides: latestVersion?.slides.map((slide) => ({
          id: slide.id,
          order: slide.order,
          content: slide.content,
          notes: slide.notes,
        })) || [],
      },
    });
  } catch (error) {
    console.error('Error fetching presentation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presentation' },
      { status: 500 }
    );
  }
}

// PATCH /api/presentations/[id] - Update presentation metadata
const UpdatePresentationSchema = z.object({
  title: z.string().min(1).optional(),
});

export async function PATCH(
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

    const validationResult = UpdatePresentationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const presentation = await prisma.presentation.update({
      where: { id: presentationId },
      data: validationResult.data,
    });

    return NextResponse.json({ presentation });
  } catch (error) {
    console.error('Error updating presentation:', error);
    return NextResponse.json(
      { error: 'Failed to update presentation' },
      { status: 500 }
    );
  }
}

// DELETE /api/presentations/[id] - Delete a presentation
export async function DELETE(
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

    await prisma.presentation.delete({
      where: { id: presentationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting presentation:', error);
    return NextResponse.json(
      { error: 'Failed to delete presentation' },
      { status: 500 }
    );
  }
}
