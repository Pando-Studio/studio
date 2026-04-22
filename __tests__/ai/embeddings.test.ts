import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cosineSimilarity,
  embeddingToVector,
  vectorToEmbedding,
  hybridSearch,
} from '@/lib/ai/embeddings';
import { prisma } from '@/lib/db';

// Mock embedding providers — return deterministic embeddings
vi.mock('@/lib/ai/embedding-providers', () => ({
  getEmbeddingProvider: vi.fn(() => ({
    modelId: 'mistral-embed',
    dimensions: 1024,
    generate: vi.fn(async (texts: string[]) =>
      texts.map(() => Array.from({ length: 1024 }, (_, i) => i / 1024))
    ),
    generateQuery: vi.fn(async () =>
      Array.from({ length: 1024 }, (_, i) => i / 1024)
    ),
  })),
  MISTRAL_DIMENSIONS: 1024,
  MISTRAL_BATCH_SIZE: 25,
}));

// Mock providers (used by HyDE)
vi.mock('@/lib/ai/providers', () => ({
  getProviderForStudio: vi.fn(async () => ({
    model: 'mock-model',
    providerKey: 'mistral',
  })),
  PROVIDER_INFO: {
    mistral: {
      name: 'Mistral AI',
      models: { chat: 'mistral-large-latest', embedding: 'mistral-embed' },
    },
  },
}));

// Mock reranker
vi.mock('@/lib/ai/reranker', () => ({
  isRerankerAvailable: vi.fn(() => false),
  createReranker: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── cosineSimilarity ──────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 10);
  });

  it('returns approximately -1.0 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 10);
  });

  it('throws when dimensions mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      'Embeddings must have the same dimensions'
    );
  });
});

// ─── embeddingToVector / vectorToEmbedding ─────────────────

describe('embeddingToVector', () => {
  it('formats embedding as pgvector string', () => {
    const result = embeddingToVector([0.1, 0.2, 0.3]);
    expect(result).toBe('[0.1,0.2,0.3]');
  });

  it('handles empty array', () => {
    expect(embeddingToVector([])).toBe('[]');
  });
});

describe('vectorToEmbedding', () => {
  it('parses pgvector string to number array', () => {
    const result = vectorToEmbedding('[0.1,0.2,0.3]');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });
});

// ─── RRF fusion logic ──────────────────────────────────────

describe('hybridSearch — RRF fusion', () => {
  const RRF_K = 60;

  function rrfScore(rank: number): number {
    return 1 / (RRF_K + rank + 1);
  }

  const denseResults = [
    { id: 'a', sourceId: 's1', content: 'dense first', metadata: null, score: 0.95 },
    { id: 'b', sourceId: 's1', content: 'dense second', metadata: null, score: 0.90 },
    { id: 'c', sourceId: 's1', content: 'dense only', metadata: null, score: 0.85 },
  ];

  const sparseResults = [
    { id: 'b', sourceId: 's1', content: 'sparse first (=dense second)', metadata: null, rank: 0.8 },
    { id: 'd', sourceId: 's1', content: 'sparse only', metadata: null, rank: 0.7 },
    { id: 'a', sourceId: 's1', content: 'sparse third (=dense first)', metadata: null, rank: 0.6 },
  ];

  beforeEach(() => {
    // Dense search mock
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    // First $queryRawUnsafe call = dense search, second = sparse search
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce(denseResults)
      .mockResolvedValueOnce(sparseResults);
  });

  it('merges dense and sparse results via RRF and ranks correctly', async () => {
    const results = await hybridSearch('studio-1', 'test query', { topK: 5 });

    // 'b' appears in both at rank 1 (dense) and rank 0 (sparse) => highest fused score
    // fused('b') = rrfScore(1) + rrfScore(0)
    // 'a' appears in both at rank 0 (dense) and rank 2 (sparse)
    // fused('a') = rrfScore(0) + rrfScore(2)
    const fusedB = rrfScore(1) + rrfScore(0);
    const fusedA = rrfScore(0) + rrfScore(2);

    // 'b' should have higher score than 'a' because its sparse rank is better
    expect(fusedB).toBeGreaterThan(fusedA);

    // Results should contain all 4 unique chunks
    expect(results).toHaveLength(4);
    // First result should be 'b' (highest fused score)
    expect(results[0].id).toBe('b');
  });

  it('returns at most topK results', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce(denseResults)
      .mockResolvedValueOnce(sparseResults);

    const results = await hybridSearch('studio-1', 'test query', { topK: 2 });
    expect(results).toHaveLength(2);
  });

  it('filters results below minScore', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce(denseResults)
      .mockResolvedValueOnce(sparseResults);

    // Set minScore very high so no results pass
    const results = await hybridSearch('studio-1', 'test query', {
      topK: 10,
      minScore: 1.0,
    });
    expect(results).toHaveLength(0);
  });
});

// ─── hybridSearch options parsing ──────────────────────────

describe('hybridSearch — options', () => {
  beforeEach(() => {
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
  });

  it('uses default candidateK=20 when rerank is false', async () => {
    await hybridSearch('studio-1', 'test', { rerank: false });

    // Dense search query should have been called with candidateK=20 as last param
    const denseCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
    expect(denseCall[denseCall.length - 1]).toBe(20);
  });

  it('increases candidateK to at least 30 when rerank is true', async () => {
    await hybridSearch('studio-1', 'test', { rerank: true, candidateK: 10 });

    // Should use Math.max(10, 30) = 30
    const denseCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
    expect(denseCall[denseCall.length - 1]).toBe(30);
  });

  it('uses HyDE branch when useHyde=true', async () => {
    const { generateText } = await import('ai');
    const mockGenerateText = vi.mocked(generateText);

    await hybridSearch('studio-1', 'test', { useHyde: true });

    // HyDE generates a hypothetical answer via generateText
    expect(mockGenerateText).toHaveBeenCalled();
  });
});
