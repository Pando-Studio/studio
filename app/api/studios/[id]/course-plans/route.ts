import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext, getPublicStudioAccess } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/studios/[id]/course-plans - List all course plans for a studio
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getPublicStudioAccess(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Fetch course plans
    const coursePlans = await prisma.coursePlan.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ coursePlans });
  } catch (error) {
    logger.error('Error fetching course plans', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch course plans' },
      { status: 500 }
    );
  }
}
