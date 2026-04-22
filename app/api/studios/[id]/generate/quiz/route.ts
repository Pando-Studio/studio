import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioAuthContext } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { generateQuizWorkflow } from '@/lib/mastra/workflows/generate-quiz.workflow';
import { validateBody, generateQuizSchema } from '@/lib/api/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/studios/[id]/generate/quiz - Generate a quiz widget
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await request.json();
    const validation = validateBody(generateQuizSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const {
      title,
      description,
      sourceIds,
      questionCount,
      answersPerQuestion,
      difficulty,
      language,
      preferredProvider,
    } = validation.data;

    // Create widget record
    const widget = await prisma.widget.create({
      data: {
        studioId,
        type: 'QUIZ',
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
        type: 'QUIZ',
        status: 'RUNNING',
        widgetId: widget.id,
      },
    });

    try {
      // Execute workflow
      const workflowRun = generateQuizWorkflow.createRun();
      const result = await workflowRun.start({
        triggerData: {
          studioId,
          title,
          description,
          sourceIds,
          questionCount,
          answersPerQuestion,
          difficulty,
          language,
          preferredProvider,
        },
      });

      // Get the quiz data from the last step
      const quizResult = result.results?.quizGenerator;
      if (!quizResult || quizResult.status !== 'success') {
        throw new Error('Quiz generation failed');
      }
      const quizData = quizResult.output;

      if (quizData) {
        // Update widget with generated data
        await prisma.widget.update({
          where: { id: widget.id },
          data: {
            data: quizData,
            status: 'READY',
          },
        });

        // Update run
        await prisma.generationRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      } else {
        throw new Error('No quiz data generated');
      }

      const updatedWidget = await prisma.widget.findUnique({
        where: { id: widget.id },
      });

      return NextResponse.json({
        widget: updatedWidget,
        runId: run.id,
      });
    } catch (workflowError) {
      // Update widget and run on error
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
    logger.error('Error generating quiz', { studioId: (await params).id, error: error instanceof Error ? error : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
