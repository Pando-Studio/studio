/**
 * RAG retrieval quality metrics.
 *
 * All functions operate on arrays of string IDs (chunk or source IDs).
 * "retrieved" = IDs returned by the search, in rank order.
 * "expected" = IDs that should have been returned (ground truth).
 */

/**
 * Precision: fraction of retrieved items that are relevant.
 *
 * precision = |retrieved ∩ expected| / |retrieved|
 *
 * Returns 0 when retrieved is empty (avoid division by zero).
 */
export function precision(retrieved: string[], expected: string[]): number {
  if (retrieved.length === 0) return 0;
  const expectedSet = new Set(expected);
  const hits = retrieved.filter((id) => expectedSet.has(id)).length;
  return hits / retrieved.length;
}

/**
 * Recall@K: fraction of expected items found in the top-K retrieved results.
 *
 * recall@K = |retrieved[:K] ∩ expected| / |expected|
 *
 * Returns 1 when expected is empty (nothing to find = perfect recall).
 */
export function recallAtK(retrieved: string[], expected: string[], k: number): number {
  if (expected.length === 0) return 1;
  const topK = retrieved.slice(0, k);
  const expectedSet = new Set(expected);
  const hits = topK.filter((id) => expectedSet.has(id)).length;
  return hits / expected.length;
}

/**
 * Mean Reciprocal Rank: 1 / (rank of the first relevant result).
 *
 * MRR = 1 / rank_first_relevant
 *
 * Returns 0 when no relevant result is found in the retrieved list.
 */
export function mrr(retrieved: string[], expected: string[]): number {
  const expectedSet = new Set(expected);
  for (let i = 0; i < retrieved.length; i++) {
    if (expectedSet.has(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Normalized Discounted Cumulative Gain at K.
 *
 * Uses binary relevance: rel(i) = 1 if retrieved[i] ∈ expected, else 0.
 *
 * DCG@K  = Σ_{i=1}^{K} rel(i) / log2(i + 1)
 * IDCG@K = Σ_{i=1}^{min(K, |expected|)} 1 / log2(i + 1)
 * NDCG@K = DCG@K / IDCG@K
 *
 * Returns 0 when expected is empty or K is 0.
 */
export function ndcg(retrieved: string[], expected: string[], k: number): number {
  if (k === 0 || expected.length === 0) return 0;

  const expectedSet = new Set(expected);
  const topK = retrieved.slice(0, k);

  // DCG: actual score
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    if (expectedSet.has(topK[i])) {
      dcg += 1 / Math.log2(i + 2); // i+2 because log2(1+1) for rank 1
    }
  }

  // IDCG: ideal score (all relevant docs at the top)
  const idealCount = Math.min(k, expected.length);
  let idcg = 0;
  for (let i = 0; i < idealCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Keyword coverage: fraction of expected keywords found in the concatenated
 * content of retrieved chunks. Case-insensitive matching.
 *
 * Returns 1 when no keywords are expected.
 */
export function keywordCoverage(
  retrievedContents: string[],
  expectedKeywords: string[]
): number {
  if (expectedKeywords.length === 0) return 1;
  const joined = retrievedContents.join(' ').toLowerCase();
  const found = expectedKeywords.filter((kw) => joined.includes(kw.toLowerCase())).length;
  return found / expectedKeywords.length;
}

/**
 * Aggregate a list of scores into mean.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
