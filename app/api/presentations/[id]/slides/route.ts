import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getPresentationAuthContext } from '@/lib/api/auth-context';

// POST /api/presentations/[id]/slides - Add a new slide
const CreateSlideSchema = z.object({
  order: z.number().optional(),
  content: z.object({
    title: z.string(),
    patternId: z.string(),
    html: z.string(),
    isInteractive: z.boolean().default(false),
    type: z.string().default('text'),
    widgetRef: z.object({
      id: z.string(),
      path: z.string(),
    }).nullable().optional(),
    imageUrl: z.string().optional(),
  }),
  notes: z.string().optional(),
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

    const validationResult = CreateSlideSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get the latest version
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            slides: {
              orderBy: { order: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!presentation || presentation.versions.length === 0) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    const latestVersion = presentation.versions[0];
    const maxOrder = latestVersion.slides[0]?.order ?? -1;

    const slide = await prisma.slide.create({
      data: {
        presentationVersionId: latestVersion.id,
        order: validationResult.data.order ?? maxOrder + 1,
        content: validationResult.data.content,
        notes: validationResult.data.notes,
      },
    });

    return NextResponse.json({ slide });
  } catch (error) {
    console.error('Error creating slide:', error);
    return NextResponse.json(
      { error: 'Failed to create slide' },
      { status: 500 }
    );
  }
}
