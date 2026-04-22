import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateText } from 'ai';
import { evaluateChunkRelevance } from '@/lib/ai/crag';

const mockGenerateText = vi.mocked(generateText);

// Minimal mock model — only used as a pass-through
const mockModel = {} as Parameters<typeof evaluateChunkRelevance>[2];

function makeChunk(id: string, content: string) {
  return { id, sourceId: `src-${id}`, content, score: 0.8 };
}

describe('evaluateChunkRelevance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps chunks with score >= 5', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '[8, 6, 9]',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Awaited<ReturnType<typeof generateText>>);

    const chunks = [makeChunk('a', 'relevant A'), makeChunk('b', 'relevant B'), makeChunk('c', 'relevant C')];

    const result = await evaluateChunkRelevance('test query', chunks, mockModel);

    expect(result).toHaveLength(3);
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops chunks with score < 5', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '[8, 2, 3]',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Awaited<ReturnType<typeof generateText>>);

    const chunks = [makeChunk('a', 'relevant'), makeChunk('b', 'noise'), makeChunk('c', 'noise')];

    const result = await evaluateChunkRelevance('test query', chunks, mockModel);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns all chunks when LLM call fails (fallback)', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('LLM timeout'));

    const chunks = [makeChunk('a', 'text A'), makeChunk('b', 'text B')];

    const result = await evaluateChunkRelevance('test query', chunks, mockModel);

    expect(result).toHaveLength(2);
    expect(result).toEqual(chunks);
  });

  it('returns all chunks when LLM response is unparseable', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'I cannot evaluate these chunks.',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Awaited<ReturnType<typeof generateText>>);

    const chunks = [makeChunk('a', 'text A')];

    const result = await evaluateChunkRelevance('test query', chunks, mockModel);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array for empty input', async () => {
    const result = await evaluateChunkRelevance('test query', [], mockModel);
    expect(result).toEqual([]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('returns all chunks when score count mismatches chunk count', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '[8, 6]',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Awaited<ReturnType<typeof generateText>>);

    const chunks = [makeChunk('a', 'A'), makeChunk('b', 'B'), makeChunk('c', 'C')];

    const result = await evaluateChunkRelevance('test query', chunks, mockModel);

    // Mismatch fallback: returns all chunks
    expect(result).toHaveLength(3);
  });
});
