import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';
import { validateBody } from '@/lib/api/schemas';
import { planStepSchema, type PlanStep } from '@/lib/ai/chat-tools';
import { templateRegistry } from '@/lib/widget-templates';
import type { WidgetType } from '@/lib/widget-templates';
import { getWidgetGenerationQueue } from '@/lib/queue/queues';
import type { WidgetGenerationJob } from '@/lib/queue/queues';
import { publishStudioEvent } from '@/lib/events/studio-events';
import { redis } from '@/lib/redis';

type RouteParams = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const executePlanSchema = z.object({
  planSteps: z.array(planStepSchema).min(1, 'At least one step is required'),
  conversationId: z.string().optional(),
});

const cancelPlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Redis key for tracking a running plan's abort flag */
function planAbortKey(planId: string): string {
  return `plan:abort:${planId}`;
}

/** Redis key for tracking plan state */
function planStateKey(planId: string): string {
  return `plan:state:${planId}`;
}

/** Resolve template ID from widget type string */
function resolveTemplateId(widgetType: string): string | null {
  const templates = templateRegistry.list();
  // Find template that produces this widget type
  const match = templates.find(
    (t) => t.widgetType === widgetType || t.id.endsWith(widgetType.toLowerCase()),
  );
  return match?.id ?? null;
}

/**
 * Wait for a generation run to reach a terminal state.
 * Polls DB every 2s, up to 5 minutes.
 */
async function waitForRunCompletion(
  runId: string,
  studioId: string,
  planId: string,
  maxWaitMs = 300_000,
): Promise<{ status: string; widgetId: string | null }> {
  const start = Date.now();
  const pollInterval = 2000;

  while (Date.now() - start < maxWaitMs) {
    // Check abort flag
    const aborted = await redis.get(planAbortKey(planId));
    if (aborted === '1') {
      return { status: 'CANCELLED', widgetId: null };
    }

    const run = await prisma.generationRun.findUnique({
      where: { id: runId, studioId },
      select: { status: true, widgetId: true },
    });

    if (!run) return { status: 'FAILED', widgetId: null };

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      return { status: run.status, widgetId: run.widgetId };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return { status: 'TIMEOUT', widgetId: null };
}

// ---------------------------------------------------------------------------
// POST — Execute a generation plan sequentially
// ---------------------------------------------------------------------------

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(executePlanSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { planSteps, conversationId } = validation.data;

    // Generate a unique plan ID
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store plan state in Redis (expires after 1 hour)
    await redis.set(
      planStateKey(planId),
      JSON.stringify({ status: 'executing', steps: planSteps }),
      'EX',
      3600,
    );

    logger.chat('plan execution started', { studioId, planId, stepCount: planSteps.length });

    // Log plan start in conversation
    if (conversationId) {
      await prisma.conversationMessage.create({
        data: {
          conversationId,
          role: 'SYSTEM',
          content: `Plan de generation lance (${planSteps.length} etapes)`,
          mode: 'ASK',
          metadata: JSON.parse(
            JSON.stringify({ type: 'plan_started', planId, steps: planSteps }),
          ),
        },
      });
    }

    // Get indexed source IDs for the studio
    const sources = await prisma.studioSource.findMany({
      where: { studioId, status: 'INDEXED' },
      select: { id: true },
    });
    const sourceIds = sources.map((s) => s.id);

    // Execute steps sequentially in background (non-blocking)
    // This is a fire-and-forget async execution
    executePlanSteps(planId, studioId, planSteps, sourceIds, conversationId ?? null).catch(
      (error: unknown) => {
        logger.error('Plan execution failed', {
          studioId,
          planId: planId,
          error: error instanceof Error ? error : String(error),
        });
      },
    );

    return NextResponse.json({ planId, status: 'executing' });
  } catch (error) {
    logger.error('Error starting plan execution', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to start plan execution' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Cancel plan execution
// ---------------------------------------------------------------------------

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(cancelPlanSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { planId } = validation.data;

    // Set abort flag in Redis
    await redis.set(planAbortKey(planId), '1', 'EX', 3600);

    logger.chat('plan cancellation requested', { studioId, planId });

    // Publish cancellation event
    await publishStudioEvent(studioId, 'plan:complete', {
      planId,
      status: 'cancelled',
    });

    return NextResponse.json({ success: true, planId, status: 'cancelling' });
  } catch (error) {
    logger.error('Error cancelling plan', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to cancel plan' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Sequential plan execution (runs in background)
// ---------------------------------------------------------------------------

async function executePlanSteps(
  planId: string,
  studioId: string,
  steps: PlanStep[],
  sourceIds: string[],
  conversationId: string | null,
): Promise<void> {
  // Map step order -> generated widget ID (for cascade)
  const stepResults = new Map<number, { widgetId: string; status: string }>();

  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  for (const step of sortedSteps) {
    // Check abort flag
    const aborted = await redis.get(planAbortKey(planId));
    if (aborted === '1') {
      // Mark remaining steps as cancelled
      await publishStudioEvent(studioId, 'plan:step-complete', {
        planId,
        stepOrder: step.order,
        status: 'cancelled',
      });
      continue;
    }

    // Check if dependency succeeded
    if (step.dependsOnStep !== undefined) {
      const parentResult = stepResults.get(step.dependsOnStep);
      if (!parentResult || parentResult.status !== 'COMPLETED') {
        // Skip this step — dependency failed
        stepResults.set(step.order, { widgetId: '', status: 'SKIPPED' });
        await publishStudioEvent(studioId, 'plan:step-complete', {
          planId,
          stepOrder: step.order,
          status: 'skipped',
          error: `Dependance echouee (etape ${step.dependsOnStep})`,
        });
        continue;
      }
    }

    // Resolve template
    const templateId = resolveTemplateId(step.widgetType);
    if (!templateId) {
      stepResults.set(step.order, { widgetId: '', status: 'FAILED' });
      await publishStudioEvent(studioId, 'plan:step-complete', {
        planId,
        stepOrder: step.order,
        status: 'failed',
        error: `Template non trouve pour le type: ${step.widgetType}`,
      });
      continue;
    }

    const template = templateRegistry.get(templateId);
    if (!template) {
      stepResults.set(step.order, { widgetId: '', status: 'FAILED' });
      await publishStudioEvent(studioId, 'plan:step-complete', {
        planId,
        stepOrder: step.order,
        status: 'failed',
        error: `Template invalide: ${templateId}`,
      });
      continue;
    }

    try {
      // Build extra source context from parent widget if cascade
      let cascadeSourceIds = [...sourceIds];
      let inputs: Record<string, unknown> = { title: step.title };

      if (step.useParentContent && step.dependsOnStep !== undefined) {
        const parentResult = stepResults.get(step.dependsOnStep);
        if (parentResult?.widgetId) {
          // Fetch parent widget content and inject as additional context
          const parentWidget = await prisma.widget.findUnique({
            where: { id: parentResult.widgetId },
            select: { id: true, data: true, title: true, sourceIds: true },
          });

          if (parentWidget) {
            // Create a virtual source from parent widget content
            // by passing the parent widget data as part of inputs
            const parentData = parentWidget.data as Record<string, unknown> | null;
            inputs = {
              ...inputs,
              parentWidgetContent: parentData
                ? JSON.stringify(parentData).substring(0, 5000)
                : '',
              parentWidgetTitle: parentWidget.title,
            };
            // Also include parent's source IDs
            if (parentWidget.sourceIds && Array.isArray(parentWidget.sourceIds)) {
              cascadeSourceIds = [
                ...new Set([...cascadeSourceIds, ...parentWidget.sourceIds as string[]]),
              ];
            }
          }
        }
      }

      if (step.description) {
        inputs.description = step.description;
      }

      // Create widget record
      const widget = await prisma.widget.create({
        data: {
          studioId,
          type: template.widgetType as WidgetType,
          title: step.title,
          data: {},
          status: 'GENERATING',
          sourceIds: cascadeSourceIds,
          templateId,
        },
      });

      // Create generation run
      const run = await prisma.generationRun.create({
        data: {
          studioId,
          type: template.widgetType as WidgetType,
          status: 'PENDING',
          widgetId: widget.id,
          metadata: {
            templateId,
            templateVersion: template.version,
            planId,
            planStep: step.order,
          },
        },
      });

      // Queue the generation job
      const queue = getWidgetGenerationQueue();
      const jobData: WidgetGenerationJob = {
        runId: run.id,
        widgetId: widget.id,
        studioId,
        templateId,
        title: step.title,
        description: step.description,
        inputs,
        sourceIds: cascadeSourceIds,
        language: 'fr',
      };

      await queue.add('generate-widget', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      // Wait for completion (polling)
      const result = await waitForRunCompletion(run.id, studioId, planId);

      const stepStatus = result.status === 'COMPLETED' ? 'completed'
        : result.status === 'CANCELLED' ? 'cancelled'
        : 'failed';

      stepResults.set(step.order, {
        widgetId: result.widgetId ?? widget.id,
        status: result.status,
      });

      // Publish step result via SSE
      await publishStudioEvent(studioId, 'plan:step-complete', {
        planId,
        stepOrder: step.order,
        status: stepStatus,
        widgetId: result.widgetId ?? widget.id,
        runId: run.id,
      });

      logger.chat('plan step completed', {
        studioId,
        planId,
        stepOrder: step.order,
        status: stepStatus,
        widgetId: result.widgetId ?? widget.id,
      });
    } catch (error: unknown) {
      stepResults.set(step.order, { widgetId: '', status: 'FAILED' });
      const errorMsg = error instanceof Error ? error.message : String(error);

      await publishStudioEvent(studioId, 'plan:step-complete', {
        planId,
        stepOrder: step.order,
        status: 'failed',
        error: errorMsg,
      });

      logger.error('Plan step failed', {
        studioId,
        planId,
        stepOrder: step.order,
        error: error instanceof Error ? error : String(error),
      });
    }
  }

  // Plan complete
  await publishStudioEvent(studioId, 'plan:complete', {
    planId,
    status: 'completed',
    results: Object.fromEntries(
      Array.from(stepResults.entries()).map(([order, result]) => [
        order,
        { widgetId: result.widgetId, status: result.status },
      ]),
    ),
  });

  // Log completion in conversation
  if (conversationId) {
    const completedCount = Array.from(stepResults.values()).filter(
      (r) => r.status === 'COMPLETED',
    ).length;

    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'SYSTEM',
        content: `Plan de generation termine: ${completedCount}/${sortedSteps.length} widget(s) genere(s) avec succes.`,
        mode: 'ASK',
        metadata: JSON.parse(
          JSON.stringify({
            type: 'plan_completed',
            planId,
            results: Object.fromEntries(stepResults),
          }),
        ),
      },
    });
  }

  // Cleanup Redis state
  await redis.del(planStateKey(planId));
  await redis.del(planAbortKey(planId));
}
