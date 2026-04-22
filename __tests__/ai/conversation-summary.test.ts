import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildConversationContext } from '@/lib/ai/conversation-summary';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';

const mockPrisma = vi.mocked(prisma);
const mockGenerateText = vi.mocked(generateText);

// Fake model for generateText
const fakeModel = {} as Parameters<typeof generateText>[0]['model'];

function makeMessages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}`,
    createdAt: new Date(Date.now() - (count - i) * 60_000),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.conversation.update.mockResolvedValue(undefined as never);
});

// ─── Short conversations ───────────────────────────────────

describe('buildConversationContext — short conversations', () => {
  it('returns all messages verbatim when <= 15 messages and no existing summary', async () => {
    const messages = makeMessages(10);
    const conversation = {
      id: 'conv-1',
      summary: null,
      summaryMessageCount: null,
      messages,
    };

    const result = await buildConversationContext(conversation, fakeModel);

    expect(result.verbatimMessages).toHaveLength(10);
    expect(result.summaryPrompt).toBe('');
    // Should NOT call generateText for summarization
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('includes existing summary prompt when <= 15 messages but summary exists', async () => {
    const messages = makeMessages(12);
    const conversation = {
      id: 'conv-1',
      summary: 'Previous context about the project',
      summaryMessageCount: 8,
      messages,
    };

    const result = await buildConversationContext(conversation, fakeModel);

    expect(result.verbatimMessages).toHaveLength(12);
    expect(result.summaryPrompt).toContain('Previous context about the project');
  });

  it('returns all messages for exactly 15 messages (boundary)', async () => {
    const messages = makeMessages(15);
    const conversation = {
      id: 'conv-2',
      summary: null,
      summaryMessageCount: null,
      messages,
    };

    const result = await buildConversationContext(conversation, fakeModel);
    expect(result.verbatimMessages).toHaveLength(15);
  });
});

// ─── Long conversations ────────────────────────────────────

describe('buildConversationContext — long conversations', () => {
  it('keeps last 10 messages verbatim and generates summary for > 15 messages', async () => {
    const messages = makeMessages(20);
    const conversation = {
      id: 'conv-3',
      summary: null,
      summaryMessageCount: null,
      messages,
    };

    mockGenerateText.mockResolvedValueOnce({
      text: 'Summary of the first 10 messages',
      usage: {},
    } as never);

    const result = await buildConversationContext(conversation, fakeModel);

    // Only 10 recent messages verbatim
    expect(result.verbatimMessages).toHaveLength(10);
    expect(result.verbatimMessages[0].content).toBe('Message 11');
    expect(result.verbatimMessages[9].content).toBe('Message 20');

    // Summary should be generated
    expect(mockGenerateText).toHaveBeenCalledOnce();
    expect(result.summaryPrompt).toContain('Summary of the first 10 messages');
  });

  it('reuses existing summary when < 5 new messages since last summarization', async () => {
    const messages = makeMessages(18);
    const conversation = {
      id: 'conv-4',
      summary: 'Existing summary from earlier',
      summaryMessageCount: 16, // only 2 new messages since last summary
      messages,
    };

    const result = await buildConversationContext(conversation, fakeModel);

    // Should NOT re-generate summary (delta = 18 - 16 = 2, < 5)
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(result.summaryPrompt).toContain('Existing summary from earlier');
    expect(result.verbatimMessages).toHaveLength(10);
  });

  it('re-generates summary when >= 5 new messages since last summarization', async () => {
    const messages = makeMessages(22);
    const conversation = {
      id: 'conv-5',
      summary: 'Old summary',
      summaryMessageCount: 16, // delta = 22 - 16 = 6 >= 5
      messages,
    };

    mockGenerateText.mockResolvedValueOnce({
      text: 'Updated summary with new context',
      usage: {},
    } as never);

    const result = await buildConversationContext(conversation, fakeModel);

    // Should re-generate summary
    expect(mockGenerateText).toHaveBeenCalledOnce();
    expect(result.summaryPrompt).toContain('Updated summary with new context');

    // Should persist the new summary
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-5' },
      data: {
        summary: 'Updated summary with new context',
        summaryMessageCount: 22,
      },
    });
  });

  it('falls back gracefully when summarization fails', async () => {
    const messages = makeMessages(20);
    const conversation = {
      id: 'conv-6',
      summary: null,
      summaryMessageCount: null,
      messages,
    };

    mockGenerateText.mockRejectedValueOnce(new Error('LLM timeout'));

    const result = await buildConversationContext(conversation, fakeModel);

    // Should still return verbatim messages, with empty summary
    expect(result.verbatimMessages).toHaveLength(10);
    expect(result.summaryPrompt).toBe('');
  });
});
