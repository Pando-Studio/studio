import { describe, it, expect } from 'vitest';
import {
  recallAtK,
  mrr,
  ndcg,
  precision,
  keywordCoverage,
} from '@/lib/ai/evaluation/metrics';

describe('recallAtK', () => {
  it('returns 1.0 when all expected items are in top-K', () => {
    expect(recallAtK(['a', 'b', 'c'], ['a', 'b'], 3)).toBe(1.0);
  });

  it('returns 0.0 when no expected items are found', () => {
    expect(recallAtK(['a', 'b', 'c'], ['d', 'e'], 3)).toBe(0.0);
  });

  it('returns partial recall when only some expected are found', () => {
    expect(recallAtK(['a', 'b', 'c'], ['a', 'd'], 3)).toBe(0.5);
  });

  it('returns 1 when expected is empty (nothing to find)', () => {
    expect(recallAtK(['a', 'b'], [], 3)).toBe(1);
  });

  it('respects the K limit', () => {
    // 'c' is expected but outside top-1
    expect(recallAtK(['a', 'b', 'c'], ['c'], 1)).toBe(0);
    expect(recallAtK(['a', 'b', 'c'], ['c'], 3)).toBe(1);
  });
});

describe('mrr', () => {
  it('returns 0.5 when first relevant item is at position 2', () => {
    expect(mrr(['b', 'a', 'c'], ['a'])).toBe(0.5);
  });

  it('returns 1.0 when first relevant item is at position 1', () => {
    expect(mrr(['a', 'b', 'c'], ['a'])).toBe(1.0);
  });

  it('returns 0 when no relevant items found', () => {
    expect(mrr(['a', 'b', 'c'], ['d'])).toBe(0);
  });

  it('uses the first relevant item only', () => {
    // 'b' at position 2 is the first relevant — MRR = 1/2
    expect(mrr(['x', 'b', 'a'], ['a', 'b'])).toBe(0.5);
  });
});

describe('ndcg', () => {
  it('returns 1.0 for perfect ranking', () => {
    // All relevant items at the top
    expect(ndcg(['a', 'b', 'c'], ['a', 'b'], 3)).toBeCloseTo(1.0);
  });

  it('returns 0 when no relevant items in top-K', () => {
    expect(ndcg(['x', 'y', 'z'], ['a', 'b'], 3)).toBe(0);
  });

  it('returns 0 when expected is empty', () => {
    expect(ndcg(['a', 'b'], [], 3)).toBe(0);
  });

  it('returns 0 when K is 0', () => {
    expect(ndcg(['a', 'b'], ['a'], 0)).toBe(0);
  });

  it('returns less than 1.0 for imperfect ranking', () => {
    // 'a' is relevant but at position 2 instead of 1
    const score = ndcg(['x', 'a'], ['a'], 2);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('precision', () => {
  it('returns 1.0 when all retrieved are relevant', () => {
    expect(precision(['a', 'b'], ['a', 'b', 'c'])).toBe(1.0);
  });

  it('returns 0.0 when no retrieved are relevant', () => {
    expect(precision(['x', 'y'], ['a', 'b'])).toBe(0.0);
  });

  it('returns 0.5 when half are relevant', () => {
    expect(precision(['a', 'x'], ['a', 'b'])).toBe(0.5);
  });

  it('returns 0 when retrieved is empty', () => {
    expect(precision([], ['a'])).toBe(0);
  });
});

describe('keywordCoverage', () => {
  it('returns 1.0 when all keywords are found', () => {
    const contents = ['This document discusses machine learning and AI.'];
    expect(keywordCoverage(contents, ['machine', 'learning', 'AI'])).toBe(1.0);
  });

  it('returns 0.0 when no keywords are found', () => {
    const contents = ['This document discusses cooking recipes.'];
    expect(keywordCoverage(contents, ['machine', 'learning'])).toBe(0.0);
  });

  it('returns partial coverage', () => {
    const contents = ['This document discusses machine design.'];
    expect(keywordCoverage(contents, ['machine', 'learning'])).toBe(0.5);
  });

  it('returns 1 when no keywords are expected', () => {
    expect(keywordCoverage(['some content'], [])).toBe(1);
  });

  it('is case-insensitive', () => {
    const contents = ['MACHINE LEARNING is great.'];
    expect(keywordCoverage(contents, ['machine', 'learning'])).toBe(1.0);
  });
});
