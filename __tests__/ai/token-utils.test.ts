import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  getContextLimit,
  MODEL_CONTEXT_LIMITS,
} from '@/lib/ai/token-utils';

describe('estimateTokens', () => {
  it('returns > 0 for non-empty text', () => {
    expect(estimateTokens('Hello world, this is a test.')).toBeGreaterThan(0);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 0 for undefined-ish input', () => {
    // The function checks `if (!text)` — empty string is falsy
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates English text at ~4 chars/token', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const tokens = estimateTokens(text);
    expect(tokens).toBe(Math.ceil(text.length / 4));
  });

  it('estimates French text at ~3 chars/token', () => {
    // Text with enough French markers to trigger the heuristic
    const text =
      'Le développement de la plateforme est en cours. Les utilisateurs peuvent créer des activités dans le studio. Cette fonctionnalité est disponible pour les enseignants qui veulent préparer leurs cours avec des exercices interactifs.';
    const tokens = estimateTokens(text);
    expect(tokens).toBe(Math.ceil(text.length / 3));
  });
});

describe('getContextLimit', () => {
  it('returns correct limit for known model', () => {
    expect(getContextLimit('gpt-4o')).toBe(128_000);
  });

  it('returns correct limit for Anthropic model', () => {
    expect(getContextLimit('claude-sonnet-4-20250514')).toBe(200_000);
  });

  it('returns correct limit for Gemini model', () => {
    expect(getContextLimit('gemini-2.0-flash')).toBe(1_000_000);
  });

  it('returns default limit for unknown model', () => {
    expect(getContextLimit('some-unknown-model')).toBe(128_000);
  });

  it('matches by prefix for versioned model IDs', () => {
    // "mistral-large-latest" should match itself or be a prefix
    expect(getContextLimit('mistral-large-latest')).toBe(128_000);
  });
});

describe('MODEL_CONTEXT_LIMITS', () => {
  it('contains entries for all 4 providers', () => {
    const keys = Object.keys(MODEL_CONTEXT_LIMITS);
    // Mistral, OpenAI, Anthropic, Google
    expect(keys.length).toBeGreaterThanOrEqual(4);

    // Check each provider has at least one entry
    expect(keys.some((k) => k.includes('mistral'))).toBe(true);
    expect(keys.some((k) => k.includes('gpt'))).toBe(true);
    expect(keys.some((k) => k.includes('claude'))).toBe(true);
    expect(keys.some((k) => k.includes('gemini'))).toBe(true);
  });

  it('all limits are positive numbers', () => {
    for (const limit of Object.values(MODEL_CONTEXT_LIMITS)) {
      expect(limit).toBeGreaterThan(0);
    }
  });
});
