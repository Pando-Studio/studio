import type { ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL to extract connection options
function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const connectionOptions: ConnectionOptions = parseRedisUrl(redisUrl);

export const queueOptions = {
  connection: connectionOptions,
};
