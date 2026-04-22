import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { templateRegistry } from '@/lib/widget-templates';
import type { WidgetType } from '@/lib/widget-templates';
import { getWidgetGenerationQueue } from '@/lib/queue/queues';
import type { WidgetGenerationJob } from '@/lib/queue/queues';
import { validateBody, generateWidgetSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/studios/[id]/widgets/generate
 * Unified widget generation endpoint using templates
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateBody(generateWidgetSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const {
      existingWidgetId,
      widgetTemplateId,
      title,
      description,
      inputs,
      sourceIds,
      language,
      preferredProvider,
    } = validation.data;

    // Validate template exists
    const template = templateRegistry.get(widgetTemplateId);
    if (!template) {
      return NextResponse.json(
        {
          error: `Template not found: ${widgetTemplateId}`,
          availableTemplates: templateRegistry.getIds(),
        },
        { status: 400 }
      );
    }

    // Create or reset widget for (re)generation
    let widget;
    if (existingWidgetId) {
      // Regeneration: reset existing widget
      widget = await prisma.widget.update({
        where: { id: existingWidgetId, studioId },
        data: { status: 'GENERATING', data: {} },
      });
    } else {
      // New generation: create widget record
      widget = await prisma.widget.create({
        data: {
          studioId,
          type: template.widgetType as WidgetType,
          title,
          data: {},
          status: 'GENERATING',
          sourceIds,
          templateId: widgetTemplateId,
        },
      });
    }

    // Create generation run with PENDING status
    const run = await prisma.generationRun.create({
      data: {
        studioId,
        type: template.widgetType as WidgetType,
        status: 'PENDING',
        widgetId: widget.id,
        metadata: {
          templateId: widgetTemplateId,
          templateVersion: template.version,
        },
      },
    });

    // Queue job for background processing
    const queue = getWidgetGenerationQueue();
    const jobData: WidgetGenerationJob = {
      runId: run.id,
      widgetId: widget.id,
      studioId,
      templateId: widgetTemplateId,
      title,
      description,
      inputs,
      sourceIds,
      language,
      preferredProvider,
    };

    const job = await queue.add('generate-widget', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      widgetId: widget.id,
      jobId: job.id,
      status: 'PENDING',
    });
  } catch (error) {
    logger.error('Error generating widget', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate widget',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/studios/[id]/widgets/generate
 * List available templates
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Return available templates
    const templates = templateRegistry.list().map((t) => ({
      id: t.id,
      name: t.name,
      version: t.version,
      description: t.description,
      widgetType: t.widgetType,
      inputSchema: t.schema.inputs,
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error('Error listing templates', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}
