/**
 * CRAG (Corrective RAG) — evaluate and filter chunks by relevance.
 *
 * After hybrid search, uses a fast LLM call to batch-evaluate chunk relevance.
 * Drops chunks with score < 5/10 to avoid injecting noise into the context.
 *
 * Non-blocking: if evaluation fails, returns all chunks unfiltered.
 */

import { generateText } from 'ai';
import { logger } from '@/lib/monitoring/logger';

interface ScoredChunk {
  id: string;
  sourceId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** Minimum relevance score (0-10) to keep a chunk */
const CRAG_MIN_SCORE = 5;

/**
 * Evaluate chunk relevance in a single batch LLM call.
 * Returns only chunks that pass the relevance threshold.
 *
 * Non-blocking: on failure, returns the original chunks unfiltered.
 */
export async function evaluateChunkRelevance(
  query: string,
  chunks: ScoredChunk[],
  model: Parameters<typeof generateText>[0]['model']
): Promise<ScoredChunk[]> {
  if (chunks.length === 0) return [];

  try {
    // Build batch evaluation prompt
    const chunkList = chunks
      .map((chunk, i) => `[${i}] ${chunk.content.substring(0, 400)}`)
      .join('\n\n');

    const { text } = await generateText({
      model,
      system: `Tu es un evaluateur de pertinence pour un systeme RAG.
Pour chaque chunk, evalue sa pertinence par rapport a la requete.
Reponds UNIQUEMENT avec un JSON array de scores entiers (0-10).
0 = completement non pertinent, 10 = parfaitement pertinent.
Le nombre de scores doit correspondre exactement au nombre de chunks.
Exemple pour 3 chunks: [8, 2, 6]`,
      prompt: `Requete: "${query}"\n\nChunks:\n${chunkList}`,
      maxOutputTokens: 100,
      temperature: 0,
    });

    // Parse scores
    const jsonMatch = text.match(/\[[\d\s,]+\]/);
    if (!jsonMatch) {
      logger.warn('CRAG: could not parse scores, keeping all chunks', {
        response: text.substring(0, 200),
      });
      return chunks;
    }

    const scores: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(scores) || scores.length !== chunks.length) {
      logger.warn('CRAG: score count mismatch, keeping all chunks', {
        expected: chunks.length,
        got: Array.isArray(scores) ? scores.length : 0,
      });
      return chunks;
    }

    // Filter chunks by score
    const filtered = chunks.filter((_, i) => {
      const score = Number(scores[i]);
      return !isNaN(score) && score >= CRAG_MIN_SCORE;
    });

    logger.info('CRAG evaluation complete', {
      query: query.substring(0, 100),
      totalChunks: chunks.length,
      keptChunks: filtered.length,
      scores: JSON.stringify(scores),
    });

    return filtered;
  } catch (error: unknown) {
    // Non-blocking: return all chunks on failure
    logger.warn('CRAG evaluation failed, keeping all chunks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return chunks;
  }
}
