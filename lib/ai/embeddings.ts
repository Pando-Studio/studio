import { generateText } from 'ai';
import { prisma } from '@/lib/db';
import {
  getEmbeddingProvider,
  MISTRAL_DIMENSIONS,
  MISTRAL_BATCH_SIZE,
} from './embedding-providers';
import { getProviderForStudio } from './providers';
import { createReranker, isRerankerAvailable } from './reranker';

const EMBEDDING_DIMENSIONS = MISTRAL_DIMENSIONS;
const BATCH_SIZE = MISTRAL_BATCH_SIZE;
const RRF_K = 60; // Reciprocal Rank Fusion constant

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

export interface SearchResult {
  id: string;
  sourceId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface HybridSearchOptions {
  sourceIds?: string[];
  topK?: number;
  candidateK?: number;
  minScore?: number;
  /** Enable post-RRF re-ranking via Jina Reranker (requires JINA_API_KEY) */
  rerank?: boolean;
  /** Enable HyDE: generate a hypothetical answer to embed instead of the raw query for dense search */
  useHyde?: boolean;
}

/**
 * Generate embedding for a single text via the configured provider
 */
export async function generateEmbedding(
  text: string,
  studioId?: string
): Promise<number[]> {
  const provider = getEmbeddingProvider(studioId);
  return provider.generateQuery(text, studioId);
}

/**
 * Generate embeddings for multiple texts (batch processing) via the configured provider
 */
export async function generateEmbeddings(
  texts: string[],
  studioId?: string
): Promise<EmbeddingResult[]> {
  const provider = getEmbeddingProvider(studioId);
  const embeddings = await provider.generate(texts, studioId);

  return texts.map((text, i) => ({
    text,
    embedding: embeddings[i],
  }));
}

/**
 * Generate embedding for a search query
 */
export async function generateQueryEmbedding(
  query: string,
  studioId?: string
): Promise<number[]> {
  return generateEmbedding(query, studioId);
}

/**
 * Dense vector search using pgvector cosine similarity
 * Uses parameterized queries to prevent SQL injection
 */
async function denseSearch(
  studioId: string,
  queryEmbedding: number[],
  sourceIds: string[] | undefined,
  candidateK: number
): Promise<Array<{ id: string; sourceId: string; content: string; metadata: Record<string, unknown> | null; score: number }>> {
  const embeddingVector = `[${queryEmbedding.join(',')}]`;

  // Increase HNSW ef_search for better recall (~99% vs ~95% at default)
  await prisma.$executeRawUnsafe('SET hnsw.ef_search = 100');

  if (sourceIds && sourceIds.length > 0) {
    return prisma.$queryRawUnsafe(`
      SELECT
        ssc.id,
        ssc."sourceId",
        ssc.content,
        ssc.metadata,
        1 - (ssc.embedding <=> $1::vector) as score
      FROM studio_source_chunks ssc
      JOIN studio_sources ss ON ssc."sourceId" = ss.id
      WHERE ss."studioId" = $2
        AND ssc.embedding IS NOT NULL
        AND ssc."sourceId" = ANY($3)
      ORDER BY ssc.embedding <=> $1::vector
      LIMIT $4
    `, embeddingVector, studioId, sourceIds, candidateK);
  }

  return prisma.$queryRawUnsafe(`
    SELECT
      ssc.id,
      ssc."sourceId",
      ssc.content,
      ssc.metadata,
      1 - (ssc.embedding <=> $1::vector) as score
    FROM studio_source_chunks ssc
    JOIN studio_sources ss ON ssc."sourceId" = ss.id
    WHERE ss."studioId" = $2
      AND ssc.embedding IS NOT NULL
    ORDER BY ssc.embedding <=> $1::vector
    LIMIT $3
  `, embeddingVector, studioId, candidateK);
}

/**
 * Sparse BM25 search using PostgreSQL tsvector with multilingual support.
 *
 * Each chunk stores its own tsvector computed with the detected language dictionary.
 * The query uses 'simple' (no stemming) to match against all languages uniformly.
 * This trades some stemming precision for universal multilingual coverage.
 */
async function sparseSearch(
  studioId: string,
  query: string,
  sourceIds: string[] | undefined,
  candidateK: number
): Promise<Array<{ id: string; sourceId: string; content: string; metadata: Record<string, unknown> | null; rank: number }>> {
  if (sourceIds && sourceIds.length > 0) {
    return prisma.$queryRawUnsafe(`
      SELECT
        ssc.id,
        ssc."sourceId",
        ssc.content,
        ssc.metadata,
        ts_rank_cd(ssc.tsv, plainto_tsquery('simple', $1)) as rank
      FROM studio_source_chunks ssc
      JOIN studio_sources ss ON ssc."sourceId" = ss.id
      WHERE ss."studioId" = $2
        AND ssc.tsv IS NOT NULL
        AND ssc.tsv @@ plainto_tsquery('simple', $1)
        AND ssc."sourceId" = ANY($3)
      ORDER BY ts_rank_cd(ssc.tsv, plainto_tsquery('simple', $1)) DESC
      LIMIT $4
    `, query, studioId, sourceIds, candidateK);
  }

  return prisma.$queryRawUnsafe(`
    SELECT
      ssc.id,
      ssc."sourceId",
      ssc.content,
      ssc.metadata,
      ts_rank_cd(ssc.tsv, plainto_tsquery('simple', $1)) as rank
    FROM studio_source_chunks ssc
    JOIN studio_sources ss ON ssc."sourceId" = ss.id
    WHERE ss."studioId" = $2
      AND ssc.tsv IS NOT NULL
      AND ssc.tsv @@ plainto_tsquery('simple', $1)
    ORDER BY ts_rank_cd(ssc.tsv, plainto_tsquery('simple', $1)) DESC
    LIMIT $3
  `, query, studioId, candidateK);
}

/**
 * Hybrid search combining dense vector search + sparse BM25 with RRF fusion.
 *
 * Pipeline:
 * 1. (Optional) HyDE: generate a hypothetical answer to use as dense query embedding
 * 2. Run dense (pgvector cosine) and sparse (tsvector BM25) searches in parallel
 * 3. Fuse results using Reciprocal Rank Fusion (RRF)
 * 4. (Optional) Re-rank top candidates via Jina Reranker
 * 5. Return top-K results sorted by final score
 */
export async function hybridSearch(
  studioId: string,
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  const {
    sourceIds,
    topK = 5,
    candidateK = 20,
    minScore = 0,
    rerank = false,
    useHyde = false,
  } = options;

  // When reranking, fetch more candidates so the reranker has enough to work with
  const rerankCandidateK = rerank ? Math.max(candidateK, 30) : candidateK;

  // Step 1: Generate query embedding (optionally via HyDE)
  let queryEmbedding: number[];
  if (useHyde) {
    queryEmbedding = await generateHydeEmbedding(studioId, query);
  } else {
    queryEmbedding = await generateQueryEmbedding(query, studioId);
  }

  // Step 2: Run dense and sparse searches in parallel
  // Sparse search always uses the original query (BM25 does not benefit from HyDE)
  const [denseResults, sparseResults] = await Promise.all([
    denseSearch(studioId, queryEmbedding, sourceIds, rerankCandidateK),
    sparseSearch(studioId, query, sourceIds, rerankCandidateK).catch((err) => {
      // Sparse search may fail if tsv column doesn't exist yet (pre-migration data)
      console.warn('[HybridSearch] Sparse search failed, using dense only:', err.message);
      return [];
    }),
  ]);

  // Step 3: RRF fusion — combine rankings from both result sets
  const scoreMap = new Map<string, {
    id: string;
    sourceId: string;
    content: string;
    metadata: Record<string, unknown> | null;
    score: number;
  }>();

  // Score from dense search ranks
  for (let i = 0; i < denseResults.length; i++) {
    const r = denseResults[i];
    const rrfScore = 1 / (RRF_K + i + 1);
    scoreMap.set(r.id, {
      id: r.id,
      sourceId: r.sourceId,
      content: r.content,
      metadata: r.metadata,
      score: rrfScore,
    });
  }

  // Add scores from sparse search ranks
  for (let i = 0; i < sparseResults.length; i++) {
    const r = sparseResults[i];
    const rrfScore = 1 / (RRF_K + i + 1);
    const existing = scoreMap.get(r.id);
    if (existing) {
      // Chunk appears in both — add scores (RRF fusion)
      existing.score += rrfScore;
    } else {
      scoreMap.set(r.id, {
        id: r.id,
        sourceId: r.sourceId,
        content: r.content,
        metadata: r.metadata,
        score: rrfScore,
      });
    }
  }

  // Sort by fused score
  const fused = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score);

  // Step 4: Optional re-ranking
  if (rerank && isRerankerAvailable() && fused.length > 0) {
    const reranker = createReranker();
    const candidates = fused.slice(0, Math.max(topK * 2, 30));

    const reranked = await reranker.rerank(
      query,
      candidates.map((r) => ({ id: r.id, content: r.content })),
      topK
    );

    // Build a lookup for metadata/sourceId from the fused results
    const fusedLookup = new Map(fused.map((r) => [r.id, r]));

    return reranked
      .filter((r) => r.score >= minScore)
      .map((r) => {
        const original = fusedLookup.get(r.id)!;
        return {
          id: r.id,
          sourceId: original.sourceId,
          content: original.content,
          score: r.score,
          metadata: original.metadata ?? undefined,
        };
      });
  }

  // No reranking — return top-K from RRF
  return fused
    .slice(0, topK)
    .filter((r) => r.score >= minScore)
    .map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      content: r.content,
      score: r.score,
      metadata: r.metadata ?? undefined,
    }));
}

/**
 * HyDE (Hypothetical Document Embeddings): generate a hypothetical answer
 * to the query using a fast LLM, then embed that answer instead of the raw query.
 * This improves dense retrieval by making the query embedding closer to
 * relevant document embeddings in vector space.
 */
async function generateHydeEmbedding(
  studioId: string,
  query: string
): Promise<number[]> {
  try {
    const { model } = await getProviderForStudio(studioId);

    const { text: hypotheticalAnswer } = await generateText({
      model,
      system:
        'You are a helpful assistant. Given a user question, write a short factual passage (2-3 sentences) ' +
        'that would answer the question. Write as if this passage comes from a reference document. ' +
        'Do not preface with "Here is..." — just write the passage directly. Respond in the same language as the question.',
      prompt: query,
      maxOutputTokens: 200,
      temperature: 0.3,
    });

    // Embed the hypothetical answer instead of the raw query
    return generateEmbedding(hypotheticalAnswer, studioId);
  } catch (error: unknown) {
    console.warn(
      '[HyDE] Failed to generate hypothetical answer, falling back to raw query embedding:',
      error instanceof Error ? error.message : String(error)
    );
    // Graceful fallback: embed the original query
    return generateEmbedding(query, studioId);
  }
}

/**
 * Semantic search using pgvector (parameterized, no SQL injection)
 * Kept as a simpler alternative to hybridSearch for cases where BM25 is not needed
 */
export async function semanticSearch(
  studioId: string,
  query: string,
  sourceIds?: string[],
  topK: number = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateQueryEmbedding(query, studioId);
  const results = await denseSearch(studioId, queryEmbedding, sourceIds, topK);

  return results.map((r) => ({
    id: r.id,
    sourceId: r.sourceId,
    content: r.content,
    score: r.score,
    metadata: r.metadata ?? undefined,
  }));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Format embedding as pgvector string
 */
export function embeddingToVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Parse pgvector string to embedding array
 */
export function vectorToEmbedding(vector: string): number[] {
  return JSON.parse(vector.replace('[', '[').replace(']', ']'));
}

/**
 * Get the full content of a source by concatenating all its chunks
 */
export async function getFullSourceContent(sourceId: string): Promise<string> {
  const chunks = await prisma.studioSourceChunk.findMany({
    where: { sourceId },
    orderBy: { chunkIndex: 'asc' },
    select: { content: true },
  });
  return chunks.map((c) => c.content).join('\n\n');
}

export { EMBEDDING_DIMENSIONS, BATCH_SIZE };
