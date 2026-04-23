import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { getStudioAuthContext, getPublicStudioAccess } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';
import { getFullSourceContent, hybridSearch } from '@/lib/ai/embeddings';
import { getProviderForStudio, PROVIDER_INFO } from '@/lib/ai/providers';
import { streamText, generateText, stepCountIs } from 'ai';
import { widgetGenerationTools, getToolsSummary, toolNeedsApproval, getToolMeta } from '@/lib/ai/chat-tools';
import { validateBody, chatMessageSchema } from '@/lib/api/schemas';
import { checkRateLimit } from '@/lib/api/rate-limit';
import {
  estimateTokens,
  getContextLimit,
  FULL_INJECTION_TOKEN_THRESHOLD,
  CONTEXT_BUDGET_RATIO,
  MIN_RELEVANCE_SCORE,
} from '@/lib/ai/token-utils';
import { buildConversationContext } from '@/lib/ai/conversation-summary';
import { getUserMemories, formatMemoriesForPrompt, extractAndSaveMemories } from '@/lib/ai/user-memory';
import { evaluateChunkRelevance } from '@/lib/ai/crag';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/studios/[id]/chat - Send a chat message
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getPublicStudioAccess(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Rate limiting: 50 requests/hour (use IP for anonymous)
    const rateLimitKey = `chat:user:${ctx.userId}`;
    const rateCheck = await checkRateLimit(rateLimitKey, 50, 3600);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } },
      );
    }

    const body = await request.json();
    const validation = validateBody(chatMessageSchema, body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    // mode is accepted for backwards compat but ignored — unified agent decides autonomously
    const { message, sourceIds, conversationId } = validation.data;

    // --- Parse @mentions from message ---
    const mentionedSourceIds: string[] = [];
    const mentionedWidgetIds: string[] = [];
    const mentionRegex = /@\[(Source|Widget|Conversation):\s*([^\]]+)\]\(([^)]+)\)/g;
    let mentionMatch;
    while ((mentionMatch = mentionRegex.exec(message)) !== null) {
      const [, mentionType, , mentionId] = mentionMatch;
      if (mentionType === 'Source') mentionedSourceIds.push(mentionId);
      else if (mentionType === 'Widget') mentionedWidgetIds.push(mentionId);
    }
    // Strip mention syntax from the message sent to the LLM
    const cleanMessage = message.replace(mentionRegex, (_, type: string, title: string) => `${type}: ${title}`);

    // Source IDs from the unified selection + @mentions
    const effectiveSourceIds: string[] = [
      ...new Set([
        ...sourceIds,
        ...mentionedSourceIds,
      ]),
    ];

    // Get or create conversation (fetch all messages for summarization)
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studioId,
          title: message.substring(0, 50),
        },
        include: { messages: true },
      });
    }

    // Save user message (mode stored as ASK for backwards compat)
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
        mode: 'ASK',
      },
    });

    // --- Fetch studio context for system prompt enrichment ---
    const [studioSources, studioWidgets] = await Promise.all([
      prisma.studioSource.findMany({
        where: { studioId },
        select: { id: true, title: true, status: true },
      }),
      prisma.widget.findMany({
        where: { studioId },
        select: { id: true, type: true, title: true, status: true },
      }),
    ]);

    const indexedSources = studioSources.filter((s) => s.status === 'INDEXED');
    const conversationTitle = conversation.title ?? 'Nouvelle conversation';

    // Build context from sources
    let contextText = '';
    const citations: Array<{ sourceId: string; content: string; score: number; chunkId?: string; excerpt?: string }> = [];

    logger.chat('request', { studioId, sourceIds: effectiveSourceIds });

    if (effectiveSourceIds.length > 0) {
      // Get source details
      const sources = await prisma.studioSource.findMany({
        where: { id: { in: effectiveSourceIds } },
        select: { id: true, title: true, status: true, s3Key: true, _count: { select: { chunks: true } } },
      });

      const sourceTitleMap = new Map(sources.map((s) => [s.id, s.title]));

      // --- Adaptive RAG: estimate total source tokens to decide strategy ---
      const fullContents = new Map<string, string>();
      for (const sourceId of effectiveSourceIds) {
        let content = await getFullSourceContent(sourceId);

        // Sibling fallback for sources with no chunks
        if (content.length === 0) {
          const source = sources.find((s) => s.id === sourceId);
          if (source?.s3Key) {
            const sibling = await prisma.studioSource.findFirst({
              where: { s3Key: source.s3Key, id: { not: sourceId } },
              select: { id: true, _count: { select: { chunks: true } } },
            });
            if (sibling && sibling._count.chunks > 0) {
              content = await getFullSourceContent(sibling.id);
            }
          }
        }

        if (content.length > 0) {
          fullContents.set(sourceId, content);
        }
      }

      const totalSourceTokens = Array.from(fullContents.values()).reduce(
        (sum, c) => sum + estimateTokens(c), 0
      );

      // Decide: full injection vs hybrid search
      const useFullInjection = totalSourceTokens < FULL_INJECTION_TOKEN_THRESHOLD;

      logger.chat('adaptive rag decision', {
        studioId,
        totalSourceTokens,
        threshold: FULL_INJECTION_TOKEN_THRESHOLD,
        strategy: useFullInjection ? 'full' : 'hybrid',
      });

      if (useFullInjection) {
        // Full content injection — sources are small enough
        const sourceContents: string[] = [];
        for (const sourceId of effectiveSourceIds) {
          const content = fullContents.get(sourceId);
          const title = sourceTitleMap.get(sourceId) || 'Document';
          if (content) {
            const sourceIndex = sourceContents.length + 1;
            sourceContents.push(`### [Source ${sourceIndex}] ${title}\n${content}`);
            citations.push({ sourceId, content: title, score: 1.0 });
          }
        }
        contextText = sourceContents.join('\n\n---\n\n');
        logger.chat('full context loaded', { studioId, contentLength: contextText.length, citationCount: citations.length });
      } else {
        // Hybrid search — sources too large for full injection
        try {
          const searchResults = await hybridSearch(studioId, message, {
            sourceIds: effectiveSourceIds,
            topK: 15,
            candidateK: 30,
          });

          // Filter by minimum relevance score
          let relevantResults = searchResults.filter((r) => r.score > MIN_RELEVANCE_SCORE);

          // CRAG: evaluate chunk relevance via LLM (non-blocking on failure)
          if (relevantResults.length > 0) {
            try {
              const { model: cragModel } = await getProviderForStudio(studioId);
              relevantResults = await evaluateChunkRelevance(
                cleanMessage,
                relevantResults,
                cragModel
              );
            } catch (cragError: unknown) {
              logger.warn('CRAG evaluation skipped', {
                studioId,
                error: cragError instanceof Error ? cragError.message : String(cragError),
              });
            }
          }

          if (relevantResults.length > 0) {
            const chunks: string[] = [];
            for (const result of relevantResults) {
              const title = sourceTitleMap.get(result.sourceId) || 'Document';
              chunks.push(`### ${title}\n${result.content}`);

              // Add citation with chunk-level detail
              if (!citations.find((c) => c.sourceId === result.sourceId)) {
                citations.push({
                  sourceId: result.sourceId,
                  content: title,
                  score: result.score,
                  chunkId: result.id,
                  excerpt: result.content.substring(0, 200),
                });
              }
            }
            contextText = chunks.join('\n\n---\n\n');
            logger.chat('hybrid search results', {
              studioId,
              totalResults: searchResults.length,
              relevantResults: relevantResults.length,
              minScore: MIN_RELEVANCE_SCORE,
              citationCount: citations.length,
            });
          } else {
            // No chunk above relevance threshold — let LLM answer without context
            logger.chat('hybrid search: no relevant chunks above score threshold', {
              studioId,
              totalResults: searchResults.length,
              minScore: MIN_RELEVANCE_SCORE,
              bestScore: searchResults.length > 0 ? searchResults[0].score : 0,
            });
          }
        } catch (searchError) {
          // If hybrid search fails entirely, fall back to truncated full content
          logger.error('Hybrid search error, falling back to full content', { studioId, error: searchError instanceof Error ? searchError : String(searchError) });
          const sourceContents: string[] = [];
          for (const sourceId of effectiveSourceIds) {
            const content = fullContents.get(sourceId);
            const title = sourceTitleMap.get(sourceId) || 'Document';
            if (content) {
              sourceContents.push(`### ${title}\n${content}`);
              citations.push({ sourceId, content: title, score: 1.0 });
            }
          }
          contextText = sourceContents.join('\n\n---\n\n');
        }
      }
    }

    // --- Inject @mentioned widget content into context ---
    if (mentionedWidgetIds.length > 0) {
      const mentionedWidgets = await prisma.widget.findMany({
        where: { id: { in: mentionedWidgetIds }, studioId },
        select: { id: true, type: true, title: true, data: true },
      });
      if (mentionedWidgets.length > 0) {
        const widgetContextParts = mentionedWidgets.map((w) => {
          const dataStr = w.data ? JSON.stringify(w.data, null, 2).substring(0, 2000) : '(pas de contenu)';
          return `### [Widget: ${w.title}] (type: ${w.type})\n${dataStr}`;
        });
        const widgetContext = widgetContextParts.join('\n\n---\n\n');
        contextText = contextText
          ? `${contextText}\n\n---\n\n## Widgets mentionnes\n${widgetContext}`
          : `## Widgets mentionnes\n${widgetContext}`;
      }
    }

    logger.chat('context ready', { studioId, contentLength: contextText.length, citationCount: citations.length });

    // Get AI provider
    const { model, key: providerKey } = await getProviderForStudio(studioId);

    // --- Conversation summarization ---
    const convContext = await buildConversationContext(
      {
        id: conversation.id,
        summary: conversation.summary ?? null,
        summaryMessageCount: conversation.summaryMessageCount ?? null,
        messages: conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      },
      model
    );

    // Build conversation history from verbatim messages
    const historyMessages = convContext.verbatimMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // --- User memory ---
    let memoryPrompt = '';
    try {
      const memories = await getUserMemories(ctx.userId);
      memoryPrompt = formatMemoriesForPrompt(memories);
    } catch (memError: unknown) {
      logger.warn('User memory loading failed (non-blocking)', {
        userId: ctx.userId,
        error: memError instanceof Error ? memError.message : String(memError),
      });
    }

    // --- Token budget: truncate source content if total context exceeds model limit ---
    const modelId = PROVIDER_INFO[providerKey].models.chat;
    const contextLimit = getContextLimit(modelId);
    const maxSourceTokens = Math.floor(contextLimit * CONTEXT_BUDGET_RATIO);

    const systemOverheadTokens = estimateTokens('Tu es un assistant intelligent pour createurs de formations.\n');
    const historyTokens = estimateTokens(historyMessages);
    const messageTokens = estimateTokens(message);
    const availableForSources = maxSourceTokens - systemOverheadTokens - historyTokens - messageTokens;

    const contextTokens = estimateTokens(contextText);
    if (contextText && contextTokens > availableForSources) {
      // Truncate source content to fit within budget
      const ratio = availableForSources / contextTokens;
      const truncatedLength = Math.floor(contextText.length * ratio);
      contextText = contextText.substring(0, truncatedLength) + '\n\n[... contenu tronque pour respecter la limite de contexte]';
      logger.chat('context truncated', {
        studioId,
        originalTokens: contextTokens,
        availableTokens: availableForSources,
        modelId,
        contextLimit,
      });
    }

    // --- Build studio state summary for system prompt ---
    const sourceSummary = indexedSources.length > 0
      ? `${indexedSources.length} source(s) indexee(s): ${indexedSources.map((s) => s.title).join(', ')}`
      : 'Aucune source indexee';

    const widgetTypeCounts = new Map<string, number>();
    for (const w of studioWidgets) {
      widgetTypeCounts.set(w.type, (widgetTypeCounts.get(w.type) ?? 0) + 1);
    }
    const widgetSummary = studioWidgets.length > 0
      ? `${studioWidgets.length} widget(s) deja genere(s): ${Array.from(widgetTypeCounts.entries()).map(([t, c]) => `${t} (${c})`).join(', ')}`
      : 'Aucun widget genere';

    // --- Unified system prompt ---
    const systemPrompt = `Tu es un assistant intelligent pour createurs de formations.
Tu es un agent autonome : tu decides seul quand repondre en texte et quand utiliser un outil pour generer du contenu.

## Etat du studio
- ${sourceSummary}
- ${widgetSummary}
- Conversation : "${conversationTitle}"

${convContext.summaryPrompt ? `${convContext.summaryPrompt}\n\n` : ''}${memoryPrompt ? `${memoryPrompt}\n\n` : ''}${contextText ? `## Contenu disponible:\n${contextText}\n` : ''}

## Outils disponibles
Tu disposes d'outils pour generer du contenu pedagogique interactif.
${getToolsSummary()}

## Instructions
- Reponds de maniere concise et pertinente.
- Quand tu utilises une information d'une source, ajoute une reference entre crochets avec le nom de la source, par exemple [Source: Nom de la source].
- Place les references a la fin de la phrase ou du paragraphe concerne.
- Tu peux resumer, expliquer ou analyser le contenu.
- Si tu ne trouves pas l'information dans le contexte, dis-le clairement.
- Si l'utilisateur demande de generer du contenu (quiz, presentation, flashcards, etc.), utilise l'outil adapte.
- Si des informations importantes manquent pour une generation, pose des questions ciblees avant d'appeler l'outil.
- Sois proactif dans la proposition de contenu a generer base sur le contexte.
- Aucun champ n'est obligatoire, mais recommande de completer les infos cles pour un meilleur resultat.`;

    const aiMessages = [
      ...(historyMessages ? [{ role: 'user' as const, content: historyMessages }] : []),
      { role: 'user' as const, content: cleanMessage },
    ];

    // Unified streaming with tools — LLM decides when to call tools
    // Viewers get no tools (read-only chat, no generation)
    const isViewer = ctx.effectiveRole === 'viewer';
    const result = streamText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      ...(isViewer ? {} : { tools: widgetGenerationTools }),
      stopWhen: stepCountIs(3),
    });

    // Create a transform stream that persists the message and appends
    // tool approval requests after the text stream completes.
    const textEncoder = new TextEncoder();
    const TOOL_APPROVAL_SEPARATOR = '\n\n---TOOL_APPROVAL---\n';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
      flush: async (controller) => {
        try {
          // Collect tool calls after stream finishes
          const toolResults = await result.toolCalls;
          const toolCallsData = toolResults?.map((tc) => ({
            toolName: tc.toolName,
            args: 'args' in tc ? (tc.args as Record<string, unknown>) : null,
          }));

          // Identify tool calls that require user approval
          const pendingApprovals: Array<{
            toolName: string;
            args: Record<string, unknown> | null;
            templateName: string;
            templateId: string;
          }> = [];

          if (toolCallsData) {
            for (const tc of toolCallsData) {
              if (toolNeedsApproval(tc.toolName)) {
                const meta = getToolMeta(tc.toolName);
                pendingApprovals.push({
                  toolName: tc.toolName,
                  args: tc.args,
                  templateName: meta?.templateName ?? tc.toolName,
                  templateId: meta?.templateId ?? '',
                });
              }
            }
          }

          // Append pending approvals as structured data at end of stream
          if (pendingApprovals.length > 0) {
            controller.enqueue(textEncoder.encode(
              TOOL_APPROVAL_SEPARATOR + JSON.stringify(pendingApprovals),
            ));
          }

          const metadata: Prisma.InputJsonValue | undefined = toolCallsData && toolCallsData.length > 0
            ? JSON.parse(JSON.stringify({
                toolCalls: toolCallsData,
                pendingApprovals: pendingApprovals.length > 0 ? pendingApprovals : undefined,
              }))
            : undefined;

          const fullText = await result.text;

          await prisma.conversationMessage.create({
            data: {
              conversationId: conversation.id,
              role: 'ASSISTANT',
              content: fullText,
              mode: 'ASK',
              citations,
              metadata,
            },
          });

          // Auto-generate title on first exchange
          if (!conversation.title || conversation.title === message.substring(0, 50)) {
            generateConversationTitle(conversation.id, message, fullText, model).catch(() => {});
          }

          // Fire-and-forget: extract and save user memories from conversation
          const allMessages: Array<{ role: string; content: string }> = [
            ...conversation.messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'USER', content: message },
            { role: 'ASSISTANT', content: fullText },
          ];
          if (allMessages.length >= 6) {
            extractAndSaveMemories(ctx.userId, allMessages, model);
          }
        } catch (error) {
          logger.error('Error persisting streamed message', { studioId, error: error instanceof Error ? error : String(error) });
        }
      },
    });

    const streamResponse = result.toTextStreamResponse();
    const streamBody = streamResponse.body;

    if (!streamBody) {
      throw new Error('No response body');
    }

    // Build citations map for the frontend (include excerpt for tooltips)
    const citationsMap = citations.map((c) => ({
      id: c.sourceId,
      name: c.content,
      chunkId: c.chunkId,
      excerpt: c.excerpt,
    }));

    return new Response(streamBody.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversation.id,
        'X-Citations': encodeURIComponent(JSON.stringify(citationsMap)),
      },
    });
  } catch (error) {
    logger.error('Error in chat', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}

/**
 * Auto-generate a conversation title from the first exchange.
 * Runs async (fire-and-forget) to not block the response.
 */
async function generateConversationTitle(
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  model: Parameters<typeof generateText>[0]['model'],
) {
  try {
    const result = await generateText({
      model,
      system: 'Generate a short title (max 6 words, in the language of the conversation) for this conversation. Return ONLY the title, no quotes, no explanation.',
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage.substring(0, 500) },
        { role: 'user', content: 'Generate a title for this conversation.' },
      ],
      maxOutputTokens: 30,
    });

    const title = result.text.trim().replace(/^["']|["']$/g, '').substring(0, 100);
    if (title) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }
  } catch (error) {
    logger.warn('Failed to generate conversation title', {
      error: error instanceof Error ? error : String(error),
    });
  }
}

// GET /api/studios/[id]/chat - Get conversation history
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: studioId } = await params;

    const ctx = await getStudioAuthContext(studioId);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    // Get conversations
    const conversations = await prisma.conversation.findMany({
      where: { studioId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    logger.error('Error fetching conversations', { error: error instanceof Error ? error : String(error) });
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
