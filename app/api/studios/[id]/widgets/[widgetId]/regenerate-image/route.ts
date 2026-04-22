import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { generateImage } from '@/lib/ai/image-generation';
import { publishStudioEvent } from '@/lib/events/studio-events';

type RouteParams = { params: Promise<{ id: string; widgetId: string }> };

// POST /api/studios/[id]/widgets/[widgetId]/regenerate-image
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId, widgetId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const widget = await prisma.widget.findUnique({
      where: { id: widgetId, studioId },
    });

    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const body = await request.json();
    const prompt = body.prompt as string;
    const style = (body.style as string) || 'photo';
    const aspectRatio = (body.aspectRatio as string) || '16:9';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const styledPrompt = `${prompt}. Style: ${style}. Aspect ratio: ${aspectRatio}.`;
    const result = await generateImage(styledPrompt, studioId);

    const updatedData = {
      ...(widget.data as Record<string, unknown>),
      imageUrl: result.imageUrl,
      model: result.model,
      prompt,
      style,
      aspectRatio,
    };

    await prisma.widget.update({
      where: { id: widgetId },
      data: { data: updatedData, updatedAt: new Date() },
    });

    await publishStudioEvent(studioId, 'widget:updated', { widgetId }).catch(() => {});

    return NextResponse.json({ imageUrl: result.imageUrl, model: result.model });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Error regenerating image', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
