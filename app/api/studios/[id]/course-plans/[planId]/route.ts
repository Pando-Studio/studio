import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, updateCoursePlanSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string; planId: string }> };

// GET /api/studios/[id]/course-plans/[planId] - Get a specific course plan
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, planId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const coursePlan = await prisma.coursePlan.findUnique({
      where: { id: planId, studioId },
    });

    if (!coursePlan) {
      return NextResponse.json({ error: 'Course plan not found' }, { status: 404 });
    }

    return NextResponse.json({ coursePlan });
  } catch (error) {
    logger.error('Error fetching course plan', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch course plan' },
      { status: 500 }
    );
  }
}

// PATCH /api/studios/[id]/course-plans/[planId] - Update a course plan
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, planId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(updateCoursePlanSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { title, description, content, metadata, status } = validation.data;

    // Check if course plan exists
    const existingPlan = await prisma.coursePlan.findUnique({
      where: { id: planId, studioId },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Course plan not found' }, { status: 404 });
    }

    // Update course plan
    const updatedPlan = await prisma.coursePlan.update({
      where: { id: planId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(metadata !== undefined && { metadata: metadata as Record<string, string> }),
        ...(status !== undefined && { status: status as 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR' }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ coursePlan: updatedPlan });
  } catch (error) {
    logger.error('Error updating course plan', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update course plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/studios/[id]/course-plans/[planId] - Delete a course plan
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, planId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Check if course plan exists
    const existingPlan = await prisma.coursePlan.findUnique({
      where: { id: planId, studioId },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Course plan not found' }, { status: 404 });
    }

    // Delete course plan
    await prisma.coursePlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting course plan', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete course plan' },
      { status: 500 }
    );
  }
}
