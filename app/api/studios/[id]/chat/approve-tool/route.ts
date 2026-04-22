import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { toolTemplateIds } from '@/lib/ai/chat-tools';
import { z } from 'zod';
import { validateBody } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

const approveToolSchema = z.object({
  toolName: z.string().min(1, 'Tool name is required'),
  args: z.record(z.unknown()).default({}),
  conversationId: z.string().optional(),
});

/**
 * POST /api/studios/[id]/chat/approve-tool
 * Execute a tool call that was previously held for user approval.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(approveToolSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { toolName, args, conversationId } = validation.data;

    // Resolve template ID from tool name
    const templateId = toolTemplateIds[toolName];
    if (!templateId) {
      return NextResponse.json(
        { error: `Unknown tool: ${toolName}` },
        { status: 400 },
      );
    }

    // Get selected source IDs from studio context
    const sources = await prisma.studioSource.findMany({
      where: { studioId, status: 'INDEXED' },
      select: { id: true },
    });
    const sourceIds = sources.map((s) => s.id);

    // Call the unified widget generation endpoint
    const response = await fetch(
      new URL(`/api/studios/${studioId}/widgets/generate`, request.url),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: templateId,
          title: (args.title as string) || 'Sans titre',
          inputs: args,
          sourceIds,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Generation failed' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();

    // Log the approved tool execution in the conversation
    if (conversationId) {
      await prisma.conversationMessage.create({
        data: {
          conversationId,
          role: 'SYSTEM',
          content: `Generation approuvee et lancee : ${(args.title as string) || toolName}`,
          mode: 'ASK',
          metadata: JSON.parse(JSON.stringify({
            type: 'tool_approved',
            toolName,
            args,
            widgetId: result.widget?.id,
            runId: result.runId,
          })),
        },
      });
    }

    logger.chat('tool approved and executed', {
      studioId,
      toolName,
      templateId,
    });

    return NextResponse.json({
      success: true,
      widget: result.widget,
      runId: result.runId,
    });
  } catch (error) {
    logger.error('Error approving tool', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to execute approved tool' },
      { status: 500 },
    );
  }
}
