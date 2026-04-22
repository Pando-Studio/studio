/**
 * Conversation Summarization — compress long conversation history.
 *
 * When a conversation exceeds 15 messages:
 * - Keep the 10 most recent messages verbatim
 * - Summarize older messages into a ~200 token summary via LLM
 * - Store the summary on the Conversation model
 * - Re-generate summary when 5+ new messages since last summarization
 */

import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { logger } from '@/lib/monitoring/logger';

/** Threshold: start summarizing when conversation exceeds this many messages */
const SUMMARY_THRESHOLD = 15;

/** Number of recent messages to keep verbatim */
const VERBATIM_TAIL = 10;

/** Re-summarize when this many new messages since last summary */
const RESUMMARIZE_DELTA = 5;

interface ConversationWithMessages {
  id: string;
  summary: string | null;
  summaryMessageCount: number | null;
  messages: Array<{
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

interface SummaryResult {
  /** System prompt section to inject (empty string if no summary) */
  summaryPrompt: string;
  /** Messages to include verbatim in the conversation context */
  verbatimMessages: Array<{ role: string; content: string }>;
}

/**
 * Build the conversation context with optional summarization.
 *
 * Non-blocking: if summarization fails, falls back to raw tail messages.
 */
export async function buildConversationContext(
  conversation: ConversationWithMessages,
  model: Parameters<typeof generateText>[0]['model']
): Promise<SummaryResult> {
  const totalMessages = conversation.messages.length;

  // Not enough messages to summarize — return all messages as-is
  if (totalMessages <= SUMMARY_THRESHOLD) {
    return {
      summaryPrompt: conversation.summary
        ? `## Resume de la conversation precedente\n${conversation.summary}`
        : '',
      verbatimMessages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  }

  // Split into old (to summarize) and recent (keep verbatim)
  const oldMessages = conversation.messages.slice(0, totalMessages - VERBATIM_TAIL);
  const recentMessages = conversation.messages.slice(totalMessages - VERBATIM_TAIL);

  // Check if we need to (re)generate the summary
  const needsSummary =
    !conversation.summary ||
    !conversation.summaryMessageCount ||
    totalMessages - conversation.summaryMessageCount >= RESUMMARIZE_DELTA;

  let summary = conversation.summary ?? '';

  if (needsSummary) {
    try {
      summary = await generateSummary(oldMessages, conversation.summary, model);

      // Persist the summary asynchronously (fire-and-forget)
      prisma.conversation
        .update({
          where: { id: conversation.id },
          data: {
            summary,
            summaryMessageCount: totalMessages,
          },
        })
        .catch((error: unknown) => {
          logger.warn('Failed to persist conversation summary', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
    } catch (error: unknown) {
      // Non-blocking: use existing summary or empty
      logger.warn('Conversation summarization failed, using fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    summaryPrompt: summary
      ? `## Resume de la conversation precedente\n${summary}`
      : '',
    verbatimMessages: recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
}

/**
 * Generate a summary of conversation messages using a fast LLM call.
 */
async function generateSummary(
  messages: Array<{ role: string; content: string }>,
  existingSummary: string | null,
  model: Parameters<typeof generateText>[0]['model']
): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content.substring(0, 500)}`)
    .join('\n');

  const contextPrefix = existingSummary
    ? `Resume precedent:\n${existingSummary}\n\nNouveau contenu a integrer:\n`
    : '';

  const { text } = await generateText({
    model,
    system: `Tu es un assistant de summarisation. Resume la conversation suivante en un paragraphe concis (~200 tokens max).
Capture les points cles: sujets discutes, decisions prises, demandes en cours, contexte important.
Reponds UNIQUEMENT avec le resume, sans preambule.
Utilise la meme langue que la conversation.`,
    prompt: `${contextPrefix}${transcript}`,
    maxOutputTokens: 300,
    temperature: 0.2,
  });

  return text.trim();
}
