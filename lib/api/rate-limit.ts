import { redis } from '@/lib/redis';

/**
 * Simple sliding-window rate limiter using Redis.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const redisKey = `ratelimit:${key}`;

  // Remove expired entries and count
  await redis.zremrangebyscore(redisKey, 0, now - windowMs);
  const count = await redis.zcard(redisKey);

  if (count >= maxRequests) {
    const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
    const oldestTime = oldest.length >= 2 ? parseInt(oldest[1], 10) : now;
    const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }

  // Add current request
  await redis.zadd(redisKey, now, `${now}:${Math.random()}`);
  await redis.expire(redisKey, windowSeconds + 1);

  return { allowed: true };
}
