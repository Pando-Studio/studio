/**
 * RAG evaluation runner.
 *
 * Executes each golden example against the live hybridSearch pipeline and
 * computes retrieval quality metrics.
 */

import { hybridSearch } from '@/lib/ai/embeddings';
import type { GoldenExample, ExampleCategory } from './golden-dataset';
import {
  precision,
  recallAtK,
  mrr,
  ndcg,
  keywordCoverage,
  mean,
} from './metrics';

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface ExampleResult {
  exampleId: string;
  query: string;
  category: ExampleCategory;
  language: string;
  retrievedSourceIds: string[];
  retrievedChunkIds: string[];
  metrics: {
    precision: number;
    recallAt5: number;
    recallAt10: number;
    mrr: number;
    ndcgAt5: number;
    ndcgAt10: number;
    keywordCoverage: number;
  };
  /** true when recall@5 >= 0.5 AND keywordCoverage >= 0.5 */
  passed: boolean;
  durationMs: number;
}

export interface AggregateMetrics {
  meanPrecision: number;
  meanRecallAt5: number;
  meanRecallAt10: number;
  meanMrr: number;
  meanNdcgAt5: number;
  meanNdcgAt10: number;
  meanKeywordCoverage: number;
}

export interface CategoryBreakdown {
  category: ExampleCategory;
  count: number;
  metrics: AggregateMetrics;
}

export interface EvaluationReport {
  studioId: string;
  timestamp: string;
  totalExamples: number;
  passedExamples: number;
  passRate: number;
  aggregate: AggregateMetrics;
  byCategory: CategoryBreakdown[];
  results: ExampleResult[];
  failedExamples: ExampleResult[];
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function aggregateResults(results: ExampleResult[]): AggregateMetrics {
  return {
    meanPrecision: mean(results.map((r) => r.metrics.precision)),
    meanRecallAt5: mean(results.map((r) => r.metrics.recallAt5)),
    meanRecallAt10: mean(results.map((r) => r.metrics.recallAt10)),
    meanMrr: mean(results.map((r) => r.metrics.mrr)),
    meanNdcgAt5: mean(results.map((r) => r.metrics.ndcgAt5)),
    meanNdcgAt10: mean(results.map((r) => r.metrics.ndcgAt10)),
    meanKeywordCoverage: mean(results.map((r) => r.metrics.keywordCoverage)),
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Run the full RAG evaluation pipeline for a studio.
 *
 * For each golden example, calls hybridSearch with topK=10, then computes
 * source-level and keyword-level metrics.
 */
export async function runEvaluation(
  studioId: string,
  dataset: GoldenExample[]
): Promise<EvaluationReport> {
  const startTime = Date.now();
  const results: ExampleResult[] = [];

  for (const example of dataset) {
    const exampleStart = Date.now();

    // Run search with topK=10 so we can compute recall@5 and recall@10
    const searchResults = await hybridSearch(studioId, example.query, {
      topK: 10,
    });

    const retrievedSourceIds = searchResults.map((r) => r.sourceId);
    const retrievedChunkIds = searchResults.map((r) => r.id);
    const retrievedContents = searchResults.map((r) => r.content);

    // De-duplicate source IDs for source-level metrics (keep rank order)
    const uniqueSourceIds = [...new Set(retrievedSourceIds)];

    const exampleMetrics = {
      precision: precision(uniqueSourceIds, example.expectedSourceIds),
      recallAt5: recallAtK(uniqueSourceIds, example.expectedSourceIds, 5),
      recallAt10: recallAtK(uniqueSourceIds, example.expectedSourceIds, 10),
      mrr: mrr(uniqueSourceIds, example.expectedSourceIds),
      ndcgAt5: ndcg(uniqueSourceIds, example.expectedSourceIds, 5),
      ndcgAt10: ndcg(uniqueSourceIds, example.expectedSourceIds, 10),
      keywordCoverage: keywordCoverage(retrievedContents, example.expectedChunkKeywords),
    };

    const passed = exampleMetrics.recallAt5 >= 0.5 && exampleMetrics.keywordCoverage >= 0.5;

    results.push({
      exampleId: example.id,
      query: example.query,
      category: example.category,
      language: example.language,
      retrievedSourceIds: uniqueSourceIds,
      retrievedChunkIds,
      metrics: exampleMetrics,
      passed,
      durationMs: Date.now() - exampleStart,
    });
  }

  // Aggregate
  const aggregate = aggregateResults(results);
  const failedExamples = results.filter((r) => !r.passed);
  const passedCount = results.length - failedExamples.length;

  // Breakdown by category
  const categories: ExampleCategory[] = ['factual', 'analytical', 'pedagogical'];
  const byCategory: CategoryBreakdown[] = categories
    .map((cat) => {
      const catResults = results.filter((r) => r.category === cat);
      if (catResults.length === 0) return null;
      return {
        category: cat,
        count: catResults.length,
        metrics: aggregateResults(catResults),
      };
    })
    .filter((b): b is CategoryBreakdown => b !== null);

  return {
    studioId,
    timestamp: new Date().toISOString(),
    totalExamples: results.length,
    passedExamples: passedCount,
    passRate: results.length > 0 ? passedCount / results.length : 0,
    aggregate,
    byCategory,
    results,
    failedExamples,
    totalDurationMs: Date.now() - startTime,
  };
}
