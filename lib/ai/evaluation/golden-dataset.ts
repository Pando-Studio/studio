/**
 * Golden Dataset types for RAG evaluation.
 *
 * A golden dataset is a curated set of query/expected-result pairs used to
 * measure retrieval quality. Users should replace the default examples in
 * dataset.json with pairs that match their actual indexed content.
 */

export type ExampleCategory = 'factual' | 'analytical' | 'pedagogical';
export type ExampleLanguage = 'fr' | 'en';

export interface GoldenExample {
  /** Unique identifier for this example */
  id: string;
  /** The search query to evaluate */
  query: string;
  /** Source IDs that should appear in the retrieved results */
  expectedSourceIds: string[];
  /** Keywords that should appear in the retrieved chunk content */
  expectedChunkKeywords: string[];
  /** Category of the question */
  category: ExampleCategory;
  /** Language of the query */
  language: ExampleLanguage;
}

/**
 * Validate that a golden example has all required fields and non-empty arrays.
 */
export function validateGoldenExample(example: unknown): example is GoldenExample {
  if (typeof example !== 'object' || example === null) return false;
  const e = example as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.query === 'string' &&
    Array.isArray(e.expectedSourceIds) &&
    e.expectedSourceIds.every((s: unknown) => typeof s === 'string') &&
    Array.isArray(e.expectedChunkKeywords) &&
    e.expectedChunkKeywords.every((s: unknown) => typeof s === 'string') &&
    (e.category === 'factual' || e.category === 'analytical' || e.category === 'pedagogical') &&
    (e.language === 'fr' || e.language === 'en')
  );
}

/**
 * Validate an entire dataset. Returns the first invalid example index, or -1
 * if all examples are valid.
 */
export function validateDataset(examples: unknown[]): number {
  for (let i = 0; i < examples.length; i++) {
    if (!validateGoldenExample(examples[i])) return i;
  }
  return -1;
}
