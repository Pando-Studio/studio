import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getPresentationAuthContext } from '@/lib/api/auth-context';

// PATCH /api/presentations/[id]/slides/[slideId] - Update a slide
const UpdateSlideSchema = z.object({
  content: z.object({
    title: z.string().optional(),
    patternId: z.string().optional(),
    html: z.string().optional(),
    isInteractive: z.boolean().optional(),
    type: z.string().optional(),
    widgetRef: z.object({
      id: z.string(),
      path: z.string(),
    }).nullable().optional(),
    imageUrl: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id: presentationId, slideId } = await params;

    const authResult = await getPresentationAuthContext(presentationId);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();

    const validationResult = UpdateSlideSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get current slide to merge content
    const currentSlide = await prisma.slide.findUnique({
      where: { id: slideId },
    });

    if (!currentSlide) {
      return NextResponse.json(
        { error: 'Slide not found' },
        { status: 404 }
      );
    }

    const updateData: { content?: object; notes?: string } = {};

    if (validationResult.data.content) {
      updateData.content = {
        ...(currentSlide.content as object),
        ...validationResult.data.content,
      };
    }

    if (validationResult.data.notes !== undefined) {
      updateData.notes = validationResult.data.notes;
    }

    const slide = await prisma.slide.update({
      where: { id: slideId },
      data: updateData,
    });

    return NextResponse.json({ slide });
  } catch (error) {
    console.error('Error updating slide:', error);
    return NextResponse.json(
      { error: 'Failed to update slide' },
      { status: 500 }
    );
  }
}

// DELETE /api/presentations/[id]/slides/[slideId] - Delete a slide
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id: presentationId, slideId } = await params;

    const authResult = await getPresentationAuthContext(presentationId);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await prisma.slide.delete({
      where: { id: slideId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slide:', error);
    return NextResponse.json(
      { error: 'Failed to delete slide' },
      { status: 500 }
    );
  }
}
