/**
 * Re-ranking module for post-RRF result refinement.
 * Uses Jina Reranker v2 API with graceful fallback when API key is absent.
 */

// ---- Interfaces ----

export interface RerankerDocument {
  id: string;
  content: string;
}

export interface RerankerResult {
  id: string;
  score: number;
}

export interface Reranker {
  rerank(
    query: string,
    documents: RerankerDocument[],
    topK: number
  ): Promise<RerankerResult[]>;
}

// ---- Jina API response types ----

interface JinaRerankResponseItem {
  index: number;
  relevance_score: number;
}

interface JinaRerankResponse {
  results: JinaRerankResponseItem[];
}

// ---- Implementations ----

/**
 * No-op reranker that preserves original order with linearly decreasing scores.
 */
class NoopReranker implements Reranker {
  async rerank(
    _query: string,
    documents: RerankerDocument[],
    topK: number
  ): Promise<RerankerResult[]> {
    return documents.slice(0, topK).map((doc, i) => ({
      id: doc.id,
      score: 1 - i / documents.length,
    }));
  }
}

/**
 * Jina Reranker v2 multilingual implementation.
 * POST https://api.jina.ai/v1/rerank
 */
class JinaReranker implements Reranker {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async rerank(
    query: string,
    documents: RerankerDocument[],
    topK: number
  ): Promise<RerankerResult[]> {
    if (documents.length === 0) return [];

    const response = await fetch('https://api.jina.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'jina-reranker-v2-base-multilingual',
        query,
        documents: documents.map((d) => d.content),
        top_n: topK,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      console.warn(
        `[Reranker] Jina API error ${response.status}: ${errorText}. Falling back to original order.`
      );
      // Graceful degradation: return original order
      return documents.slice(0, topK).map((doc, i) => ({
        id: doc.id,
        score: 1 - i / documents.length,
      }));
    }

    const data = (await response.json()) as JinaRerankResponse;

    return data.results.map((item) => ({
      id: documents[item.index].id,
      score: item.relevance_score,
    }));
  }
}

// ---- Factory ----

/**
 * Create the appropriate reranker based on environment configuration.
 * Returns JinaReranker if JINA_API_KEY is set, otherwise NoopReranker.
 */
export function createReranker(): Reranker {
  const apiKey = process.env.JINA_API_KEY;
  if (apiKey) {
    return new JinaReranker(apiKey);
  }
  return new NoopReranker();
}

/**
 * Check if a real (non-noop) reranker is available.
 */
export function isRerankerAvailable(): boolean {
  return !!process.env.JINA_API_KEY;
}
