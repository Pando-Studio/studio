import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL!;

// Client pour cache et commandes generales
export const redis = new Redis(redisUrl);

// Client dedie pour pub/sub (subscriber)
export const redisSub = new Redis(redisUrl);

// Client dedie pour pub/sub (publisher)
export const redisPub = new Redis(redisUrl);

// Cache keys pour Studio
export const CACHE_KEYS = {
  // Studios
  studio: (id: string) => `studio:${id}`,
  studioSources: (studioId: string) => `studio:${studioId}:sources`,

  // Conversations
  conversation: (studioId: string) => `studio:${studioId}:conversation`,
  conversationMessages: (conversationId: string) => `conversation:${conversationId}:messages`,

  // Widgets
  widget: (id: string) => `widget:${id}`,
  studioWidgets: (studioId: string) => `studio:${studioId}:widgets`,

  // Presentations
  presentation: (id: string) => `presentation:${id}`,
  studioPresentation: (studioId: string) => `studio:${studioId}:presentations`,

  // Generation runs
  generationRun: (id: string) => `generation:${id}`,

  // Provider configs
  providerConfig: (studioId: string, provider: string) =>
    `studio:${studioId}:provider:${provider}`,
} as const;

// TTLs (en secondes)
export const CACHE_TTL = {
  STUDIO: 3600, // 1h - studio en cache
  SOURCES: 1800, // 30min - sources
  CONVERSATION: 7200, // 2h - conversation
  WIDGET: 3600, // 1h - widget
  PRESENTATION: 3600, // 1h - presentation
  GENERATION_RUN: 86400, // 24h - run de generation
  PROVIDER_CONFIG: 3600, // 1h - config provider
} as const;

// Types pour donnees en cache
export interface CachedStudio {
  id: string;
  title: string;
  description?: string;
  userId?: string;
  anonymousSessionId?: string;
  sourcesCount: number;
  widgetsCount: number;
}

export interface CachedGenerationRun {
  id: string;
  studioId: string;
  type: string;
  status: string;
  progress: number;
  estimatedTokens?: number;
  actualTokens?: number;
  error?: string;
}
