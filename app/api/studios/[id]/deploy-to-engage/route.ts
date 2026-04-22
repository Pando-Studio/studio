import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { validateBody, deployToEngageSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// Types deployable to Engage (matching Engage ActivityType enum)
const DEPLOYABLE_TYPES = ['MULTIPLE_CHOICE', 'QUIZ', 'WORDCLOUD', 'POSTIT', 'ROLEPLAY', 'RANKING', 'OPENTEXT'];

/**
 * POST /api/studios/[id]/deploy-to-engage
 * Deploy studio widgets as an Engage project + live session
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(deployToEngageSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { widgetIds, title } = validation.data;

    // Fetch all widgets from this studio
    const allWidgets = await prisma.widget.findMany({
      where: { studioId },
      orderBy: { order: 'asc' },
    });

    // Determine which widgets to deploy
    const targetWidgets = widgetIds
      ? allWidgets.filter((w) => widgetIds.includes(w.id))
      : allWidgets.filter((w) => !w.parentId); // Root widgets only

    // Collect deployable activities: flatten composites, keep only deployable leaves
    const activities: Array<{
      type: string;
      title: string;
      description?: string;
      config: Record<string, unknown>;
      order: number;
    }> = [];

    function collectLeaves(widgets: typeof allWidgets) {
      for (const widget of widgets) {
        if (widget.kind === 'LEAF' && DEPLOYABLE_TYPES.includes(widget.type) && widget.status === 'READY') {
          activities.push({
            type: widget.type,
            title: widget.title,
            description: widget.description || undefined,
            config: widget.data as Record<string, unknown>,
            order: activities.length,
          });
        } else if (widget.kind === 'COMPOSED') {
          // Get children and recurse
          let children = allWidgets
            .filter((w) => w.parentId === widget.id)
            .sort((a, b) => a.order - b.order);

          // For COURSE_MODULE, sort by slot order
          if (widget.type === 'COURSE_MODULE') {
            const SLOT_ORDER = ['intro', 'activities', 'assessment'];
            children = [...children].sort((a, b) => {
              const aSlotIdx = SLOT_ORDER.indexOf(a.slotId || '');
              const bSlotIdx = SLOT_ORDER.indexOf(b.slotId || '');
              if (aSlotIdx !== bSlotIdx) return aSlotIdx - bSlotIdx;
              return a.order - b.order;
            });
          }

          collectLeaves(children);
        }
      }
    }

    collectLeaves(targetWidgets);

    if (activities.length === 0) {
      return NextResponse.json(
        {
          error: 'Aucun widget deployable. Les widgets doivent etre READY et de type MULTIPLE_CHOICE/QUIZ/WORDCLOUD/POSTIT/ROLEPLAY/RANKING/OPENTEXT.',
        },
        { status: 400 }
      );
    }

    // Call Engage import API
    const engageUrl = process.env.NEXT_PUBLIC_ENGAGE_URL || 'http://localhost:3000';
    const engageSecret = process.env.ENGAGE_API_SECRET;

    if (!engageSecret) {
      return NextResponse.json(
        { error: 'ENGAGE_API_SECRET is not configured' },
        { status: 500 }
      );
    }

    const engageResponse = await fetch(`${engageUrl}/api/projects/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': engageSecret,
      },
      body: JSON.stringify({
        title: title || ctx.studio.title,
        description: ctx.studio.description,
        activities,
        createSession: true,
        metadata: {
          studioId: ctx.studio.id,
          studioWidgetIds: activities.map((_, i) => targetWidgets[i]?.id).filter(Boolean),
        },
      }),
    });

    if (!engageResponse.ok) {
      const engageError = await engageResponse.json().catch(() => ({ error: 'Unknown Engage error' }));
      return NextResponse.json(
        { error: `Erreur Engage: ${engageError.error || 'Unknown'}` },
        { status: 502 }
      );
    }

    const engageData = await engageResponse.json();

    return NextResponse.json({
      engageProjectId: engageData.project.id,
      sessionCode: engageData.session?.code,
      sessionId: engageData.session?.id,
      presenterUrl: engageData.session?.presenterUrl,
      participantUrl: engageData.session?.joinUrl,
      activitiesCount: engageData.activities.length,
    });
  } catch (error) {
    logger.error('Error deploying to Engage', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deploy to Engage' },
      { status: 500 }
    );
  }
}
