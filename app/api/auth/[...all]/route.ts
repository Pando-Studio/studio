import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { checkRateLimit } from '@/lib/api/rate-limit';

const { GET: originalGET, POST: originalPOST } = toNextJsHandler(auth.handler);

// Rate limits per auth action
const AUTH_RATE_LIMITS: Record<string, { max: number; windowSeconds: number }> = {
  'sign-in/email': { max: 5, windowSeconds: 900 }, // 5 per 15 min
  'sign-up/email': { max: 3, windowSeconds: 900 }, // 3 per 15 min
};

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function extractAuthPath(url: string): string | null {
  const match = url.match(/\/api\/auth\/(.+)/);
  return match?.[1] ?? null;
}

async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const authPath = extractAuthPath(request.url);

  if (authPath) {
    const rateConfig = AUTH_RATE_LIMITS[authPath];
    if (rateConfig) {
      const ip = getClientIP(request);
      const result = await checkRateLimit(
        `auth:${authPath}:${ip}`,
        rateConfig.max,
        rateConfig.windowSeconds,
      );

      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: { 'Retry-After': String(result.retryAfter) },
          },
        );
      }
    }
  }

  return handler(request);
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, originalGET);
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, originalPOST);
}
