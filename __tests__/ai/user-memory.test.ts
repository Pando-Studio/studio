import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatMemoriesForPrompt,
  getUserMemories,
  extractMemories,
} from '@/lib/ai/user-memory';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';

const mockPrisma = vi.mocked(prisma);
const mockGenerateText = vi.mocked(generateText);

const fakeModel = {} as Parameters<typeof generateText>[0]['model'];

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── formatMemoriesForPrompt ───────────────────────────────

describe('formatMemoriesForPrompt', () => {
  it('returns empty string for empty memories array', () => {
    expect(formatMemoriesForPrompt([])).toBe('');
  });

  it('groups memories by category with correct labels', () => {
    const memories = [
      { category: 'preference', content: 'Prefere les reponses en francais' },
      { category: 'preference', content: 'Format bullet points' },
      { category: 'context', content: 'Formateur en marketing digital' },
      { category: 'pedagogical', content: 'Privilegier les cas pratiques' },
      { category: 'directive', content: 'Ne jamais generer de QCM' },
    ];

    const result = formatMemoriesForPrompt(memories);

    expect(result).toContain('## Memoire utilisateur');
    expect(result).toContain('### Preferences utilisateur');
    expect(result).toContain('- Prefere les reponses en francais');
    expect(result).toContain('- Format bullet points');
    expect(result).toContain('### Contexte utilisateur');
    expect(result).toContain('- Formateur en marketing digital');
    expect(result).toContain('### Preferences pedagogiques');
    expect(result).toContain('- Privilegier les cas pratiques');
    expect(result).toContain('### Directives explicites');
    expect(result).toContain('- Ne jamais generer de QCM');
  });

  it('uses category name as label for unknown categories', () => {
    const memories = [{ category: 'custom_category', content: 'Some note' }];
    const result = formatMemoriesForPrompt(memories);
    expect(result).toContain('### custom_category');
  });
});

// ─── getUserMemories ───────────────────────────────────────

describe('getUserMemories', () => {
  it('calls Prisma with correct params and returns sorted memories', async () => {
    const mockMemories = [
      {
        id: 'm1',
        userId: 'user-1',
        category: 'preference',
        content: 'Recent memory',
        createdAt: new Date('2026-04-15'),
        updatedAt: new Date('2026-04-15'),
      },
      {
        id: 'm2',
        userId: 'user-1',
        category: 'context',
        content: 'Older memory',
        createdAt: new Date('2026-04-10'),
        updatedAt: new Date('2026-04-10'),
      },
    ];

    mockPrisma.userMemory.findMany.mockResolvedValue(mockMemories as never);

    const result = await getUserMemories('user-1');

    expect(mockPrisma.userMemory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(result).toEqual(mockMemories);
  });
});

// ─── extractMemories ───────────────────────────────────────

describe('extractMemories', () => {
  it('returns empty array for conversations with < 3 messages', async () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];

    const result = await extractMemories(messages, fakeModel);
    expect(result).toEqual([]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('extracts valid memories from LLM response', async () => {
    const messages = [
      { role: 'user', content: 'Je suis formateur en marketing' },
      { role: 'assistant', content: 'Compris, je note votre contexte.' },
      { role: 'user', content: 'Toujours repondre en francais SVP' },
    ];

    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([
        { category: 'context', content: 'Formateur en marketing' },
        { category: 'preference', content: 'Reponses en francais' },
      ]),
      usage: {},
    } as never);

    const result = await extractMemories(messages, fakeModel);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      category: 'context',
      content: 'Formateur en marketing',
    });
    expect(result[1]).toEqual({
      category: 'preference',
      content: 'Reponses en francais',
    });
  });

  it('handles LLM response wrapped in markdown code block', async () => {
    const messages = [
      { role: 'user', content: 'msg1' },
      { role: 'assistant', content: 'msg2' },
      { role: 'user', content: 'msg3' },
    ];

    mockGenerateText.mockResolvedValueOnce({
      text: '```json\n[{"category":"directive","content":"No QCM"}]\n```',
      usage: {},
    } as never);

    const result = await extractMemories(messages, fakeModel);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('directive');
  });

  it('filters out entries with invalid categories', async () => {
    const messages = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ];

    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([
        { category: 'preference', content: 'Valid' },
        { category: 'invalid_category', content: 'Invalid' },
        { category: 'context', content: 'Also valid' },
      ]),
      usage: {},
    } as never);

    const result = await extractMemories(messages, fakeModel);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.category)).toEqual(['preference', 'context']);
  });

  it('returns empty array when LLM returns unparseable response', async () => {
    const messages = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ];

    mockGenerateText.mockResolvedValueOnce({
      text: 'This is not JSON at all',
      usage: {},
    } as never);

    const result = await extractMemories(messages, fakeModel);
    expect(result).toEqual([]);
  });
});
