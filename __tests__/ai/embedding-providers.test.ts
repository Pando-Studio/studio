import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEmbeddingProvider,
  MISTRAL_DIMENSIONS,
  MISTRAL_BATCH_SIZE,
} from '@/lib/ai/embedding-providers';
import { prisma } from '@/lib/db';

// Mock Mistral SDK — must be a real class so `new Mistral(...)` works
const mockEmbeddingsCreate = vi.fn();
vi.mock('@mistralai/mistralai', () => {
  class MistralMock {
    embeddings = { create: mockEmbeddingsCreate };
  }
  return { Mistral: MistralMock };
});

// Mock providers
vi.mock('@/lib/ai/providers', () => ({
  PROVIDER_INFO: {
    mistral: {
      name: 'Mistral AI',
      models: { chat: 'mistral-large-latest', embedding: 'mistral-embed' },
    },
    openai: { name: 'OpenAI', models: { chat: 'gpt-4o' } },
    anthropic: { name: 'Anthropic', models: { chat: 'claude-3-opus' } },
    google: { name: 'Google', models: { chat: 'gemini-pro' } },
  },
}));

const mockPrisma = vi.mocked(prisma);
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MISTRAL_API_KEY = 'test-mistral-key';
  mockPrisma.providerConfig.findUnique.mockResolvedValue(null as never);
  mockPrisma.studio.findUnique.mockResolvedValue(null as never);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

// ─── getEmbeddingProvider ──────────────────────────────────

describe('getEmbeddingProvider', () => {
  it('returns a provider with correct modelId and dimensions', () => {
    const provider = getEmbeddingProvider();

    expect(provider.modelId).toBe('mistral-embed');
    expect(provider.dimensions).toBe(MISTRAL_DIMENSIONS);
    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.generateQuery).toBe('function');
  });

  it('has MISTRAL_DIMENSIONS = 1024', () => {
    expect(MISTRAL_DIMENSIONS).toBe(1024);
  });

  it('has MISTRAL_BATCH_SIZE = 25', () => {
    expect(MISTRAL_BATCH_SIZE).toBe(25);
  });
});

// ─── Batch processing ──────────────────────────────────────

describe('MistralEmbeddingProvider — batching', () => {
  function makeFakeEmbedding(dim: number): number[] {
    return Array.from({ length: dim }, (_, i) => i * 0.001);
  }

  it('processes a single batch for <= 25 texts', async () => {
    const provider = getEmbeddingProvider();
    const texts = Array.from({ length: 10 }, (_, i) => `text ${i}`);

    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: texts.map(() => ({ embedding: makeFakeEmbedding(1024) })),
    });

    const results = await provider.generate(texts);

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(10);
    expect(results[0]).toHaveLength(1024);
  });

  it('splits into multiple batches for > 25 texts', async () => {
    const provider = getEmbeddingProvider();
    const texts = Array.from({ length: 30 }, (_, i) => `text ${i}`);

    // First batch: 25 texts
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: Array.from({ length: 25 }, () => ({
        embedding: makeFakeEmbedding(1024),
      })),
    });
    // Second batch: 5 texts
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: Array.from({ length: 5 }, () => ({
        embedding: makeFakeEmbedding(1024),
      })),
    });

    const results = await provider.generate(texts);

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(30);
  });

  it('generateQuery returns a single embedding vector', async () => {
    const provider = getEmbeddingProvider();
    const fakeEmb = makeFakeEmbedding(1024);

    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: fakeEmb }],
    });

    const result = await provider.generateQuery('test query');

    expect(result).toEqual(fakeEmb);
    expect(result).toHaveLength(1024);
  });
});
