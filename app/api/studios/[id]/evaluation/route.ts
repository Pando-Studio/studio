import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateAnonymousSession } from '@/lib/anonymous-session';
import { redis } from '@/lib/redis';
import { runEvaluation } from '@/lib/ai/evaluation/run-evaluation';
import { validateDataset } from '@/lib/ai/evaluation/golden-dataset';
import type { GoldenExample } from '@/lib/ai/evaluation/golden-dataset';
import defaultDataset from '@/lib/ai/evaluation/dataset.json';

type RouteParams = { params: Promise<{ id: string }> };

const RATE_LIMIT_KEY = (studioId: string) => `eval:ratelimit:${studioId}`;
const RATE_LIMIT_TTL = 60; // 1 minute

// POST /api/studios/[id]/evaluation - Run RAG evaluation
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;
    const headersList = await headers();
    const cookieStore = await cookies();

    // Auth check
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id;

    const anonymousCode = cookieStore.get('studio_anonymous_code')?.value;
    let anonymousSessionId: string | null = null;

    if (anonymousCode) {
      const anonSession = await validateAnonymousSession(anonymousCode);
      anonymousSessionId = anonSession?.id ?? null;
    }

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify studio exists and belongs to user
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    if (
      (userId && studio.userId !== userId) ||
      (!userId && anonymousSessionId && studio.anonymousSessionId !== anonymousSessionId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit: 1 evaluation per minute per studio
    const rateLimitKey = RATE_LIMIT_KEY(studioId);
    const existing = await redis.get(rateLimitKey);
    if (existing) {
      const ttl = await redis.ttl(rateLimitKey);
      return NextResponse.json(
        {
          error: 'Rate limited. Evaluation is expensive — please wait before retrying.',
          retryAfterSeconds: ttl > 0 ? ttl : RATE_LIMIT_TTL,
        },
        { status: 429 }
      );
    }

    // Set rate limit lock
    await redis.set(rateLimitKey, '1', 'EX', RATE_LIMIT_TTL);

    // Parse body
    const body = (await request.json()) as { examples?: unknown[] };

    let dataset: GoldenExample[];

    if (body.examples && Array.isArray(body.examples) && body.examples.length > 0) {
      // Validate user-provided dataset
      const invalidIdx = validateDataset(body.examples);
      if (invalidIdx !== -1) {
        return NextResponse.json(
          {
            error: `Invalid example at index ${invalidIdx}. Each example must have: id, query, expectedSourceIds, expectedChunkKeywords, category (factual|analytical|pedagogical), language (fr|en).`,
          },
          { status: 400 }
        );
      }
      dataset = body.examples as GoldenExample[];
    } else {
      // Use default dataset
      dataset = defaultDataset as GoldenExample[];
    }

    // Run evaluation
    const report = await runEvaluation(studioId, dataset);

    return NextResponse.json({ report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Evaluation] Error:', message);
    return NextResponse.json(
      { error: 'Evaluation failed', details: message },
      { status: 500 }
    );
  }
}
