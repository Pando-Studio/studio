import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateAnonymousSession } from '@/lib/anonymous-session';

type RouteParams = { params: Promise<{ id: string }> };

const KEEPALIVE_INTERVAL_MS = 60_000;

/**
 * GET /api/studios/[id]/events — SSE endpoint for real-time studio events.
 *
 * Uses a dedicated Redis subscriber per connection (ioredis requires one
 * subscriber per subscription set). The subscriber listens on
 * `studio:<studioId>:events` and forwards every message as an SSE event.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id: studioId } = await params;
  const headersList = await headers();
  const cookieStore = await cookies();

  // --- Auth -----------------------------------------------------------------
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

  // --- Studio ownership check -----------------------------------------------
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
  });

  if (!studio) {
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
  }

  const isOwner =
    (userId && studio.userId === userId) ||
    (anonymousSessionId && studio.anonymousSessionId === anonymousSessionId);

  if (!isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // --- SSE stream -----------------------------------------------------------
  const redisUrl = process.env.REDIS_URL!;
  const channel = `studio:${studioId}:events`;

  // Each SSE connection gets its own Redis subscriber (ioredis requirement).
  const subscriber = new Redis(redisUrl);

  const stream = new ReadableStream({
    start(controller) {
      let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;

        if (keepaliveTimer) {
          clearInterval(keepaliveTimer);
          keepaliveTimer = null;
        }

        subscriber.quit().catch((err: unknown) => {
          console.warn(
            `[SSE] Redis subscriber quit error for studio ${studioId}:`,
            err instanceof Error ? err.message : String(err),
          );
        });
      };

      // --- Redis error / close handlers ---
      subscriber.on('error', (err: Error) => {
        console.error(
          `[SSE] Redis subscriber error for studio ${studioId}:`,
          err.message,
        );
        cleanup();
        try {
          controller.close();
        } catch {
          // Stream already closed — nothing to do.
        }
      });

      subscriber.on('close', () => {
        console.warn(
          `[SSE] Redis subscriber closed for studio ${studioId}`,
        );
        cleanup();
        try {
          controller.close();
        } catch {
          // Stream already closed.
        }
      });

      // --- Message handler ---
      subscriber.subscribe(channel).catch((err: unknown) => {
        console.error(
          `[SSE] Failed to subscribe to ${channel}:`,
          err instanceof Error ? err.message : String(err),
        );
        cleanup();
        try {
          controller.close();
        } catch {
          // Stream already closed.
        }
      });

      subscriber.on('message', (_ch: string, message: string) => {
        if (closed) return;

        try {
          controller.enqueue(
            new TextEncoder().encode(`data: ${message}\n\n`),
          );
        } catch {
          // Client disconnected — the enqueue will throw if the stream is closed.
          cleanup();
        }
      });

      // --- Keepalive ---
      // SSE spec: lines starting with ':' are comments ignored by EventSource.
      keepaliveTimer = setInterval(() => {
        if (closed) return;

        try {
          controller.enqueue(
            new TextEncoder().encode(': keepalive\n\n'),
          );
        } catch {
          // Stream closed by client.
          cleanup();
        }
      }, KEEPALIVE_INTERVAL_MS);

      // --- Client abort ---
      request.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}
