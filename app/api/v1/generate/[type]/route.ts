import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { prisma, type Prisma } from '@/lib/db';
import { authenticateApiKey } from '@/lib/api/api-key-auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { logger } from '@/lib/monitoring/logger';
import {
  templateRegistry,
  jsonSchemaToZod,
  buildPromptFromTemplate,
} from '@/lib/widget-templates';
import type { WidgetType } from '@/lib/widget-templates';
import { getProviderForStudio, type ProviderKey } from '@/lib/ai/providers';

type RouteParams = { params: Promise<{ type: string }> };

/** Max 100 requests per hour per API key */
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

/**
 * Resolve or create a dedicated "API" studio for this user.
 * API usage does not require the user to manually create a studio.
 */
async function getOrCreateApiStudio(userId: string): Promise<string> {
  // Look for an existing API-dedicated studio
  const existing = await prisma.studio.findFirst({
    where: {
      userId,
      title: '__api__',
    },
    select: { id: true },
  });

  if (existing) return existing.id;

  const studio = await prisma.studio.create({
    data: {
      userId,
      title: '__api__',
      description: 'Auto-created studio for API v1 usage',
    },
  });

  return studio.id;
}

/**
 * Find a template by slug (URL param `type`).
 * Matches against the last segment of template IDs, e.g.
 * "quiz-interactive" matches "qiplim/quiz-interactive".
 */
function resolveTemplate(typeSlug: string) {
  // First try exact match on the slug portion
  for (const template of templateRegistry.list()) {
    const slug = template.id.split('/').pop();
    if (slug === typeSlug) {
      return template;
    }
  }
  // Then try full ID match
  return templateRegistry.get(typeSlug);
}

/**
 * POST /api/v1/generate/{type}
 * Stateless widget generation via API key auth.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const startTime = Date.now();

  try {
    const { type: typeSlug } = await params;

    // --- Auth ---
    const authResult = await authenticateApiKey(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }
    const { userId } = authResult;

    // --- Rate limit ---
    const rateKey = `apiv1:${userId}`;
    const rateResult = await checkRateLimit(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateResult.retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(rateResult.retryAfter) },
        },
      );
    }

    // --- Parse body ---
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const sources = Array.isArray(body.sources) ? body.sources.filter((s): s is string => typeof s === 'string') : [];
    const inputs = (typeof body.inputs === 'object' && body.inputs !== null && !Array.isArray(body.inputs))
      ? body.inputs as Record<string, unknown>
      : {};
    const language = typeof body.language === 'string' ? body.language : 'fr';
    const preferredProvider = typeof body.provider === 'string' ? body.provider : undefined;

    // --- Resolve template ---
    const template = resolveTemplate(typeSlug);
    if (!template) {
      return NextResponse.json(
        {
          error: `Unknown widget type: ${typeSlug}`,
          availableTypes: templateRegistry.list().map((t) => t.id.split('/').pop()),
        },
        { status: 400 },
      );
    }

    // --- Validate inputs against template schema ---
    const inputSchema = jsonSchemaToZod(template.schema.inputs);
    const inputValidation = inputSchema.safeParse(inputs);
    if (!inputValidation.success) {
      const errors = inputValidation.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return NextResponse.json(
        { error: 'Invalid inputs', details: errors },
        { status: 400 },
      );
    }
    const validatedInputs = inputValidation.data as Record<string, unknown>;

    // --- Get or create API studio ---
    const studioId = await getOrCreateApiStudio(userId);

    // --- Build context from raw source texts ---
    const contextText = sources.join('\n\n');

    // --- Build prompt ---
    const userPrompt = buildPromptFromTemplate(template.generation.userPromptTemplate, {
      title,
      inputs: validatedInputs,
      context: contextText,
      language,
    });

    // --- Get AI provider ---
    const { model, key: providerKey } = await getProviderForStudio(
      studioId,
      preferredProvider as ProviderKey | undefined,
    );

    // --- Generate output schema ---
    const outputSchema = jsonSchemaToZod(template.schema.activitySpec);

    // --- Generate ---
    const result = await generateObject({
      model,
      schema: outputSchema,
      system: template.generation.systemPrompt,
      prompt: userPrompt,
      temperature: template.generation.parameters.temperature,
      maxOutputTokens: template.generation.parameters.maxTokens,
    });

    const widgetData = result.object as Record<string, unknown>;
    const usage = result.usage;

    // --- Persist widget + generation run for analytics ---
    const widget = await prisma.widget.create({
      data: {
        studioId,
        type: template.widgetType as WidgetType,
        title,
        data: widgetData as Prisma.InputJsonValue,
        status: 'READY',
        templateId: template.id,
      },
    });

    await prisma.generationRun.create({
      data: {
        studioId,
        type: template.widgetType,
        status: 'COMPLETED',
        widgetId: widget.id,
        actualTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        completedAt: new Date(),
        metadata: {
          apiVersion: 'v1',
          templateId: template.id,
          templateVersion: template.version,
          provider: providerKey,
          durationMs: Date.now() - startTime,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      widget: {
        id: widget.id,
        type: template.widgetType,
        title,
        data: widgetData,
      },
      usage: {
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        totalTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        model: model.modelId ?? providerKey,
        provider: providerKey,
      },
      template: {
        id: template.id,
        version: template.version,
      },
    });
  } catch (error: unknown) {
    logger.error('API v1 generate error', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
