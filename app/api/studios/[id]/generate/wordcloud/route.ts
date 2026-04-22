import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { generateWordcloudWorkflow } from '@/lib/mastra/workflows/generate-wordcloud.workflow';
import { validateBody, generateWordcloudSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/studios/[id]/generate/wordcloud - Generate a wordcloud widget
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(generateWordcloudSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const {
      title,
      description,
      sourceIds,
      language,
      preferredProvider,
    } = validation.data;

    // Create widget record
    const widget = await prisma.widget.create({
      data: {
        studioId,
        type: 'WORDCLOUD',
        title,
        data: {},
        status: 'GENERATING',
        sourceIds,
      },
    });

    // Create generation run
    const run = await prisma.generationRun.create({
      data: {
        studioId,
        type: 'WORDCLOUD',
        status: 'RUNNING',
        widgetId: widget.id,
      },
    });

    try {
      // Execute workflow
      const workflowRun = generateWordcloudWorkflow.createRun();
      const result = await workflowRun.start({
        triggerData: {
          studioId,
          title,
          description,
          sourceIds,
          language,
          preferredProvider,
        },
      });

      const wordcloudResult = result.results?.wordcloudGenerator;
      if (!wordcloudResult || wordcloudResult.status !== 'success') {
        throw new Error('Wordcloud generation failed');
      }
      const wordcloudData = wordcloudResult.output;

      if (wordcloudData) {
        await prisma.widget.update({
          where: { id: widget.id },
          data: {
            data: wordcloudData,
            status: 'READY',
          },
        });

        await prisma.generationRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      } else {
        throw new Error('No wordcloud data generated');
      }

      const updatedWidget = await prisma.widget.findUnique({
        where: { id: widget.id },
      });

      return NextResponse.json({
        widget: updatedWidget,
        runId: run.id,
      });
    } catch (workflowError) {
      await prisma.widget.update({
        where: { id: widget.id },
        data: { status: 'ERROR' },
      });

      await prisma.generationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorLog: workflowError instanceof Error ? workflowError.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw workflowError;
    }
  } catch (error) {
    logger.error('Error generating wordcloud', { studioId: (await params).id, error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate wordcloud' },
      { status: 500 }
    );
  }
}
