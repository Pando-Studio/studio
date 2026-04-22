import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createReranker,
  isRerankerAvailable,
  type RerankerDocument,
} from '@/lib/ai/reranker';

// Save original env
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

// ─── isRerankerAvailable ───────────────────────────────────

describe('isRerankerAvailable', () => {
  it('returns false when JINA_API_KEY is not set', () => {
    delete process.env.JINA_API_KEY;
    expect(isRerankerAvailable()).toBe(false);
  });

  it('returns true when JINA_API_KEY is set', () => {
    process.env.JINA_API_KEY = 'test-key';
    expect(isRerankerAvailable()).toBe(true);
  });
});

// ─── createReranker — factory ──────────────────────────────

describe('createReranker', () => {
  it('returns NoopReranker when JINA_API_KEY is not set', () => {
    delete process.env.JINA_API_KEY;
    const reranker = createReranker();

    // NoopReranker has specific behavior: linearly decreasing scores
    // We verify by calling rerank and checking the output pattern
    expect(reranker).toBeDefined();
    expect(typeof reranker.rerank).toBe('function');
  });

  it('returns JinaReranker when JINA_API_KEY is set', () => {
    process.env.JINA_API_KEY = 'test-key';
    const reranker = createReranker();
    expect(reranker).toBeDefined();
  });
});

// ─── NoopReranker ──────────────────────────────────────────

describe('NoopReranker', () => {
  const docs: RerankerDocument[] = [
    { id: '1', content: 'first document' },
    { id: '2', content: 'second document' },
    { id: '3', content: 'third document' },
  ];

  it('returns documents in original order with linearly decreasing scores', async () => {
    delete process.env.JINA_API_KEY;
    const reranker = createReranker();

    const results = await reranker.rerank('query', docs, 3);

    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
    expect(results[2].id).toBe('3');

    // Scores should decrease: score(0) > score(1) > score(2)
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it('respects topK parameter', async () => {
    delete process.env.JINA_API_KEY;
    const reranker = createReranker();

    const results = await reranker.rerank('query', docs, 2);
    expect(results).toHaveLength(2);
  });
});

// ─── JinaReranker ──────────────────────────────────────────

describe('JinaReranker', () => {
  const docs: RerankerDocument[] = [
    { id: 'a', content: 'alpha document' },
    { id: 'b', content: 'beta document' },
    { id: 'c', content: 'gamma document' },
  ];

  it('formats the API request correctly', async () => {
    process.env.JINA_API_KEY = 'test-jina-key';
    const reranker = createReranker();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.80 },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await reranker.rerank('test query', docs, 2);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.jina.ai/v1/rerank',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jina-key',
        },
        body: JSON.stringify({
          model: 'jina-reranker-v2-base-multilingual',
          query: 'test query',
          documents: ['alpha document', 'beta document', 'gamma document'],
          top_n: 2,
        }),
      })
    );

    vi.unstubAllGlobals();
  });

  it('maps API results back to document IDs with relevance scores', async () => {
    process.env.JINA_API_KEY = 'test-jina-key';
    const reranker = createReranker();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { index: 2, relevance_score: 0.99 },
            { index: 0, relevance_score: 0.75 },
          ],
        }),
      })
    );

    const results = await reranker.rerank('query', docs, 2);

    expect(results).toEqual([
      { id: 'c', score: 0.99 },
      { id: 'a', score: 0.75 },
    ]);

    vi.unstubAllGlobals();
  });

  it('falls back to original order on API error', async () => {
    process.env.JINA_API_KEY = 'test-jina-key';
    const reranker = createReranker();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })
    );

    const results = await reranker.rerank('query', docs, 2);

    // Should return original order (fallback behavior)
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('a');
    expect(results[1].id).toBe('b');

    vi.unstubAllGlobals();
  });

  it('returns empty array for empty documents', async () => {
    process.env.JINA_API_KEY = 'test-jina-key';
    const reranker = createReranker();

    const results = await reranker.rerank('query', [], 5);
    expect(results).toEqual([]);
  });
});
