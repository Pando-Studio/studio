import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api/rate-limit';

interface AIRateLimitConfig {
  /** Rate limit key prefix (e.g. 'ai:generate', 'ai:chat') */
  prefix: string;
  /** Max requests per window — per user (default: 30) */
  userLimit?: number;
  /** Window in seconds (default: 3600 = 1 hour) */
  windowSeconds?: number;
}

const DEFAULTS = {
  userLimit: 30,
  windowSeconds: 3600,
};

/** Global IP rate limit: 100 AI requests/min across all endpoints */
const IP_LIMIT = 100;
const IP_WINDOW_SECONDS = 60;

/**
 * Check IP rate limit + per-user rate limit for AI/generation endpoints.
 * Requires an authenticated userId (no anonymous support).
 * Returns allowed:true or a NextResponse error (429).
 */
export async function checkAIRateLimit(
  userId: string,
  config: AIRateLimitConfig,
): Promise<
  | { allowed: true }
  | { allowed: false; response: NextResponse }
> {
  // 1. IP-based global rate limit (flood protection)
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';

  const ipResult = await checkRateLimit(
    `ip:ai:${ip}`,
    IP_LIMIT,
    IP_WINDOW_SECONDS,
  );

  if (!ipResult.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        },
      ),
    };
  }

  // 2. Per-user rate limit
  const key = `${config.prefix}:${userId}`;
  const limit = config.userLimit ?? DEFAULTS.userLimit;
  const windowSeconds = config.windowSeconds ?? DEFAULTS.windowSeconds;

  const result = await checkRateLimit(key, limit, windowSeconds);

  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        },
      ),
    };
  }

  return { allowed: true };
}
