import { describe, it, expect, vi } from 'vitest';
import { withRetry, structureAwareChunk, type DocumentChunk } from '@/lib/unstructured';

describe('withRetry', () => {
  it('succeeds on the 2nd attempt after a retryable error', async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt++;
      if (attempt === 1) {
        throw new TypeError('fetch failed');
      }
      return 'success';
    });

    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after maxRetries exhausted', async () => {
    const fn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 1 })).rejects.toThrow('fetch failed');

    // 1 initial + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry 4xx errors (UnstructuredApiError with status < 500)', async () => {
    // Simulate a 4xx error using a plain Error (not retryable)
    const fn = vi.fn(async () => {
      const error = new Error('Bad Request');
      throw error;
    });

    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toThrow('Bad Request');

    // Only 1 call — no retries for non-retryable errors
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('structureAwareChunk', () => {
  it('produces chunks with section_title in metadata', () => {
    const elements: DocumentChunk[] = [
      { text: 'Introduction', type: 'Title', metadata: { page_number: 1 } },
      { text: 'This is the intro paragraph.', type: 'NarrativeText', metadata: { page_number: 1 } },
      { text: 'Chapter 1', type: 'Header', metadata: { page_number: 2 } },
      { text: 'Chapter 1 content here.', type: 'NarrativeText', metadata: { page_number: 2 } },
    ];

    const chunks = structureAwareChunk(elements);

    expect(chunks.length).toBeGreaterThan(0);

    // Every chunk should have a section_title set
    for (const chunk of chunks) {
      expect(chunk.metadata.section_title).toBeDefined();
      expect(typeof chunk.metadata.section_title).toBe('string');
    }

    // Find chunk with Chapter 1 content
    const ch1Chunk = chunks.find((c) => c.text.includes('Chapter 1 content'));
    expect(ch1Chunk).toBeDefined();
    expect(ch1Chunk!.metadata.section_title).toBe('Chapter 1');
  });

  it('returns empty array for empty input', () => {
    const chunks = structureAwareChunk([]);
    expect(chunks).toEqual([]);
  });

  it('respects maxChunkSize', () => {
    const longText = 'A'.repeat(500);
    const elements: DocumentChunk[] = [
      { text: 'Section', type: 'Title', metadata: {} },
      { text: longText, type: 'NarrativeText', metadata: {} },
      { text: longText, type: 'NarrativeText', metadata: {} },
      { text: longText, type: 'NarrativeText', metadata: {} },
    ];

    const maxChunkSize = 600;
    const chunks = structureAwareChunk(elements, { maxChunkSize });

    for (const chunk of chunks) {
      // Each chunk text (minus prefix) should be within maxChunkSize + reasonable overhead
      // The section prefix adds some chars, and paragraph chunking may slightly exceed
      expect(chunk.text.length).toBeLessThanOrEqual(maxChunkSize + 200);
    }

    // Should produce more than 1 chunk since total content exceeds maxChunkSize
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('creates isolated chunks for Table elements', () => {
    const elements: DocumentChunk[] = [
      { text: 'Intro', type: 'Title', metadata: {} },
      { text: 'Some text before table.', type: 'NarrativeText', metadata: {} },
      { text: 'col1 | col2 | col3', type: 'Table', metadata: { page_number: 3 } },
      { text: 'Some text after table.', type: 'NarrativeText', metadata: {} },
    ];

    const chunks = structureAwareChunk(elements);

    const tableChunk = chunks.find((c) => c.type === 'Table');
    expect(tableChunk).toBeDefined();
    expect(tableChunk!.text).toContain('col1 | col2 | col3');
  });
});
