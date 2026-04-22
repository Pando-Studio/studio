import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody } from '@/lib/api/schemas';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const togglePublicSchema = z.object({
  isPublic: z.boolean(),
});

const createShareSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
});

// GET /api/studios/[id]/share — List shares + public status
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { isPublic: true, publicSlug: true },
    });

    const shares = await prisma.studioShare.findMany({
      where: { studioId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      isPublic: studio?.isPublic ?? false,
      publicSlug: studio?.publicSlug ?? null,
      publicUrl: studio?.publicSlug ? `/s/${studio.publicSlug}` : null,
      shares,
    });
  } catch (error) {
    logger.error('Error fetching shares', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
  }
}

// PATCH /api/studios/[id]/share — Toggle public access
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(togglePublicSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { isPublic } = validation.data;

    const updated = await prisma.studio.update({
      where: { id: studioId },
      data: {
        isPublic,
        publicSlug: isPublic ? crypto.randomUUID().slice(0, 10) : null,
      },
      select: { isPublic: true, publicSlug: true },
    });

    return NextResponse.json({
      isPublic: updated.isPublic,
      publicSlug: updated.publicSlug,
      publicUrl: updated.publicSlug ? `/s/${updated.publicSlug}` : null,
    });
  } catch (error) {
    logger.error('Error toggling public share', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 });
  }
}

// POST /api/studios/[id]/share — Create a share
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(createShareSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { email, userId, role } = validation.data;

    // Resolve user by email if needed
    let resolvedUserId = userId;
    if (!resolvedUserId && email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) resolvedUserId = user.id;
    }

    const share = await prisma.studioShare.create({
      data: {
        studioId,
        userId: resolvedUserId ?? null,
        email: email ?? null,
        role,
      },
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    logger.error('Error creating share', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
  }
}
