/**
 * Token estimation utilities for context budget management.
 *
 * Uses character-based heuristics (no tokenizer dependency).
 * French text averages ~3 chars/token, English ~4 chars/token.
 */

/** Rough regex: if >30% of chars are accented / common French patterns, treat as French */
function looksLikeFrench(text: string): boolean {
  const sample = text.substring(0, 2000);
  const frenchPattern = /[àâéèêëïîôùûüçœæ]|(\b(le|la|les|de|du|des|un|une|et|est|en|dans|pour|sur|avec|qui|que|ce|cette|il|elle|nous|vous|ils|pas|ne|au|aux)\b)/gi;
  const matches = sample.match(frenchPattern);
  return (matches?.length ?? 0) > sample.split(/\s+/).length * 0.15;
}

/**
 * Estimate token count for a text string.
 * ~4 chars/token for English, ~3 chars/token for French.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const charsPerToken = looksLikeFrench(text) ? 3 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Context window limits per model (in tokens).
 * Maps model identifiers used in PROVIDER_INFO to their limits.
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Mistral
  'mistral-large-latest': 128_000,
  // OpenAI
  'gpt-4o': 128_000,
  // Anthropic
  'claude-sonnet-4-20250514': 200_000,
  // Google
  'gemini-2.0-flash': 1_000_000,
};

/** Default limit when model is not in the map */
const DEFAULT_CONTEXT_LIMIT = 128_000;

/**
 * Get the context window limit for a given model identifier.
 */
export function getContextLimit(modelId: string): number {
  // Try exact match first, then prefix match
  if (MODEL_CONTEXT_LIMITS[modelId]) return MODEL_CONTEXT_LIMITS[modelId];
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (modelId.startsWith(key) || key.startsWith(modelId)) return limit;
  }
  return DEFAULT_CONTEXT_LIMIT;
}

/** Adaptive RAG threshold: below this, inject full content */
export const FULL_INJECTION_TOKEN_THRESHOLD = 20_000;

/** Max ratio of context window to use for source content */
export const CONTEXT_BUDGET_RATIO = 0.8;

/** Minimum hybrid search score to consider a chunk relevant */
export const MIN_RELEVANCE_SCORE = 0.3;
