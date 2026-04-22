/**
 * User Memory — extract and persist user preferences/directives from conversations.
 *
 * Memory categories:
 * - preference: user style/format preferences (e.g. "toujours en francais")
 * - context: user context info (e.g. "je suis formateur en marketing")
 * - pedagogical: pedagogical preferences (e.g. "privilegier les cas pratiques")
 * - directive: explicit instructions (e.g. "ne jamais generer de QCM")
 */

import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { logger } from '@/lib/monitoring/logger';

export interface MemoryEntry {
  category: 'preference' | 'context' | 'pedagogical' | 'directive';
  content: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * Load all memories for a user, ordered by most recent first.
 */
export async function getUserMemories(userId: string) {
  return prisma.userMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Format memories for injection into the system prompt.
 */
export function formatMemoriesForPrompt(
  memories: Array<{ category: string; content: string }>
): string {
  if (memories.length === 0) return '';

  const grouped = new Map<string, string[]>();
  for (const m of memories) {
    const list = grouped.get(m.category) ?? [];
    list.push(m.content);
    grouped.set(m.category, list);
  }

  const sections: string[] = [];
  const labels: Record<string, string> = {
    preference: 'Preferences utilisateur',
    context: 'Contexte utilisateur',
    pedagogical: 'Preferences pedagogiques',
    directive: 'Directives explicites',
  };

  for (const [category, items] of grouped) {
    const label = labels[category] ?? category;
    sections.push(`### ${label}\n${items.map((i) => `- ${i}`).join('\n')}`);
  }

  return `## Memoire utilisateur\n${sections.join('\n\n')}`;
}

/**
 * Extract memories from a conversation using a fast LLM call.
 * Returns structured memory entries to persist.
 */
export async function extractMemories(
  conversationMessages: ConversationMessage[],
  model: Parameters<typeof generateText>[0]['model']
): Promise<MemoryEntry[]> {
  if (conversationMessages.length < 3) return [];

  const transcript = conversationMessages
    .slice(-20) // Only look at recent messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const { text } = await generateText({
    model,
    system: `Tu es un extracteur de memoire utilisateur. Analyse la conversation et extrais les preferences, le contexte, les preferences pedagogiques et les directives explicites de l'utilisateur.

Reponds UNIQUEMENT avec un JSON array. Chaque element doit avoir:
- "category": "preference" | "context" | "pedagogical" | "directive"
- "content": une phrase courte decrivant la memoire

Exemples:
[{"category":"preference","content":"Prefere les reponses en francais"},{"category":"pedagogical","content":"Privilegier les etudes de cas reels"}]

Si aucune memoire n'est detectee, reponds avec un tableau vide: []
Ne repete pas les memoires deja evidentes ou triviales.`,
    prompt: transcript,
    maxOutputTokens: 500,
    temperature: 0.1,
  });

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    const validCategories = new Set(['preference', 'context', 'pedagogical', 'directive']);
    return parsed.filter(
      (entry): entry is MemoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        'category' in entry &&
        'content' in entry &&
        typeof (entry as Record<string, unknown>).category === 'string' &&
        typeof (entry as Record<string, unknown>).content === 'string' &&
        validCategories.has((entry as Record<string, unknown>).category as string)
    );
  } catch {
    logger.warn('Failed to parse memory extraction response', { error: text.substring(0, 200) });
    return [];
  }
}

/**
 * Save extracted memories for a user.
 * Deduplicates by checking existing memories with similar content.
 */
export async function saveMemories(
  userId: string,
  memories: MemoryEntry[]
): Promise<void> {
  if (memories.length === 0) return;

  // Load existing memories to avoid duplicates
  const existing = await prisma.userMemory.findMany({
    where: { userId },
    select: { content: true, category: true },
  });

  const existingSet = new Set(
    existing.map((m) => `${m.category}:${m.content.toLowerCase().trim()}`)
  );

  const newMemories = memories.filter(
    (m) => !existingSet.has(`${m.category}:${m.content.toLowerCase().trim()}`)
  );

  if (newMemories.length === 0) return;

  await prisma.userMemory.createMany({
    data: newMemories.map((m) => ({
      userId,
      category: m.category,
      content: m.content,
    })),
  });

  logger.info('User memories saved', {
    userId,
    count: newMemories.length.toString(),
  });
}

/**
 * Fire-and-forget: extract and save memories from a conversation.
 * Non-blocking — failures are logged and swallowed.
 */
export function extractAndSaveMemories(
  userId: string,
  conversationMessages: ConversationMessage[],
  model: Parameters<typeof generateText>[0]['model']
): void {
  extractMemories(conversationMessages, model)
    .then((memories) => saveMemories(userId, memories))
    .catch((error: unknown) => {
      logger.warn('Memory extraction failed (non-blocking)', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}
