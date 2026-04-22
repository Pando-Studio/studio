import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { resolveWidgetAccess, isAccessError } from '@/lib/api/resolve-widget-access';
import { logger } from '@/lib/monitoring/logger';

type RouteParams = { params: Promise<{ slug: string; widgetId: string }> };

// GET /api/public/s/[slug]/w/[widgetId] — Get a single public widget + role
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug, widgetId } = await params;

    // Optional auth — don't fail if not logged in
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id;
    } catch {
      // No session — that's fine for public access
    }

    const result = await resolveWidgetAccess(slug, widgetId, userId);

    if (isAccessError(result)) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      widget: result.widget,
      role: result.role,
      studio: result.studio,
    });
  } catch (error) {
    logger.error('Error fetching public widget', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json({ error: 'Failed to fetch widget' }, { status: 500 });
  }
}
