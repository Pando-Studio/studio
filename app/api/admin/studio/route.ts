import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireRole, isAuthError } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import {
  serializeError,
  type StudioBFFRequest,
} from '@prisma/studio-core/data/bff';

// ── Singleton PG pool for Studio queries ──

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

// ── Query helpers ──

interface Query<T = Record<string, unknown>> {
  sql: string;
  parameters: readonly unknown[];
  transformations?: Partial<Record<keyof T, 'json-parse'>>;
}

function applyTransformations<T>(
  rows: Record<string, unknown>[],
  transformations?: Partial<Record<keyof T, 'json-parse'>>
): unknown[] {
  if (!transformations) return rows;

  return rows.map((row) => {
    const transformed = { ...row };
    for (const [key, type] of Object.entries(transformations)) {
      if (type === 'json-parse' && typeof transformed[key] === 'string') {
        try {
          transformed[key] = JSON.parse(transformed[key] as string);
        } catch {
          // leave as-is
        }
      }
    }
    return transformed;
  });
}

async function executeQuery<T>(
  query: Query<T>
): Promise<[{ name: string; message: string }, undefined] | [null, unknown[]]> {
  try {
    const result = await getPool().query(
      query.sql,
      query.parameters as unknown[]
    );
    const rows = applyTransformations(result.rows, query.transformations);
    return [null, rows];
  } catch (error) {
    return [serializeError(error), undefined];
  }
}

async function executeTransaction(
  queries: readonly Query<unknown>[]
): Promise<
  [{ name: string; message: string }, undefined] | [null, unknown[][]]
> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const results: unknown[][] = [];

    for (const query of queries) {
      const result = await client.query(
        query.sql,
        query.parameters as unknown[]
      );
      results.push(
        applyTransformations(result.rows, query.transformations)
      );
    }

    await client.query('COMMIT');
    return [null, results];
  } catch (error) {
    await client.query('ROLLBACK');
    return [serializeError(error), undefined];
  } finally {
    client.release();
  }
}

// ── Rate limiting (sliding window via simple in-memory counter) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

function checkAdminRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// ── Route handler ──

export async function POST(request: Request) {
  const authResult = await requireRole('admin');
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  if (!checkAdminRateLimit(authResult.userId)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  const payload = (await request.json()) as StudioBFFRequest;

  // Audit log
  logger.warn('Admin Studio query', {
    userId: authResult.userId,
    procedure: payload.procedure,
  });

  if (payload.procedure === 'query') {
    const result = await executeQuery(payload.query);
    return NextResponse.json(result);
  }

  if (payload.procedure === 'sequence') {
    const [firstQuery, secondQuery] = payload.sequence;
    const [firstError, firstResult] = await executeQuery(firstQuery);

    if (firstError) {
      return NextResponse.json([[firstError]]);
    }

    const [secondError, secondResult] = await executeQuery(secondQuery);

    if (secondError) {
      return NextResponse.json([
        [null, firstResult],
        [secondError],
      ]);
    }

    return NextResponse.json([
      [null, firstResult],
      [null, secondResult],
    ]);
  }

  if (payload.procedure === 'transaction') {
    const result = await executeTransaction(payload.queries);
    return NextResponse.json(result);
  }

  if (payload.procedure === 'sql-lint') {
    // No built-in PostgreSQL SQL linter — return empty diagnostics
    return NextResponse.json([null, { diagnostics: [] }]);
  }

  return NextResponse.json({ error: 'Invalid procedure' }, { status: 400 });
}
