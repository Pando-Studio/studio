/**
 * Global test setup — mocks for all external dependencies.
 * Vitest loads this before every test file.
 */
import { vi } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────
vi.mock('@/lib/db', () => {
  const mockPrisma = {
    studio: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    widget: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studioShare: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    documentChunk: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    presentation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studioSourceChunk: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userMemory: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    userProviderConfig: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    providerConfig: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    studioSource: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn((fn: (prisma: unknown) => unknown) => fn(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

// ─── Mock Redis ─────────────────────────────────────
vi.mock('ioredis', () => {
  const RedisMock = vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
    ttl: vi.fn().mockResolvedValue(3600),
    quit: vi.fn(),
  }));
  return { default: RedisMock };
});

// ─── Mock AI SDK (Vercel) ───────────────────────────
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'mocked response', usage: {} }),
  generateObject: vi.fn().mockResolvedValue({ object: {}, usage: {} }),
  streamText: vi.fn().mockReturnValue({
    textStream: (async function* () {
      yield 'mocked ';
      yield 'stream';
    })(),
    toDataStreamResponse: vi.fn(),
  }),
}));

// ─── Mock Logger ────────────────────────────────────
vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Mock Next.js headers/cookies ───────────────────
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));

// ─── Mock BetterAuth ────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));
