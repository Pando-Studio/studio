import { prisma } from '@/lib/db';
import { generateEmbeddings, embeddingToVector } from './embeddings';
import { chunkText } from '../unstructured';

/**
 * Serializes widget data to human-readable text for embedding/RAG.
 */
export function serializeWidgetToText(
  widget: { type: string; title: string; description?: string | null; data: Record<string, unknown> }
): string {
  const parts: string[] = [];
  parts.push(`# ${widget.title}`);
  if (widget.description) parts.push(widget.description);
  parts.push(`Type: ${widget.type}`);
  parts.push('');

  const data = widget.data;

  switch (widget.type) {
    case 'QUIZ':
    case 'MULTIPLE_CHOICE': {
      const questions = (data.questions || []) as Array<{
        question: string;
        options?: Array<string | { label: string; isCorrect?: boolean }>;
        correctAnswer?: string | string[];
        explanation?: string;
      }>;
      questions.forEach((q, i) => {
        parts.push(`## Question ${i + 1}`);
        parts.push(q.question);
        if (q.options) {
          q.options.forEach((opt, j) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const isCorrect = typeof opt === 'object' && opt.isCorrect;
            parts.push(`  ${j + 1}. ${label}${isCorrect ? ' (correct)' : ''}`);
          });
        }
        if (q.correctAnswer) {
          const ans = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer;
          parts.push(`Bonne reponse: ${ans}`);
        }
        if (q.explanation) parts.push(`Explication: ${q.explanation}`);
        parts.push('');
      });
      break;
    }

    case 'WORDCLOUD': {
      if (data.prompt) parts.push(`Question: ${data.prompt}`);
      if (data.maxWords) parts.push(`Max mots: ${data.maxWords}`);
      break;
    }

    case 'ROLEPLAY': {
      if (data.scenario) parts.push(`## Scenario\n${data.scenario}`);
      if (data.context) parts.push(`## Contexte\n${data.context}`);
      const roles = (data.roles || []) as Array<{
        name: string;
        description: string;
        personality?: string;
        objectives?: string[];
      }>;
      roles.forEach((role) => {
        parts.push(`## Role: ${role.name}`);
        parts.push(role.description);
        if (role.personality) parts.push(`Personnalite: ${role.personality}`);
        if (role.objectives?.length) {
          parts.push('Objectifs:');
          role.objectives.forEach((obj) => parts.push(`  - ${obj}`));
        }
        parts.push('');
      });
      if (data.objectives) {
        parts.push('## Objectifs pedagogiques');
        (data.objectives as string[]).forEach((obj) => parts.push(`  - ${obj}`));
      }
      break;
    }

    case 'RANKING': {
      if (data.prompt) parts.push(`Consigne: ${data.prompt}`);
      const items = (data.items || []) as Array<{ label: string; description?: string }>;
      items.forEach((item, i) => {
        parts.push(`  ${i + 1}. ${item.label}${item.description ? ` - ${item.description}` : ''}`);
      });
      break;
    }

    case 'POSTIT': {
      if (data.prompt) parts.push(`Question: ${data.prompt}`);
      if (data.categories) {
        parts.push('Categories:');
        (data.categories as string[]).forEach((cat) => parts.push(`  - ${cat}`));
      }
      break;
    }

    case 'OPENTEXT': {
      if (data.prompt) parts.push(`Question: ${data.prompt}`);
      if (data.guidelines) parts.push(`Consignes: ${data.guidelines}`);
      break;
    }

    case 'PRESENTATION': {
      const slides = (data.slides || []) as Array<{ title?: string; content?: string }>;
      slides.forEach((slide, i) => {
        parts.push(`## Slide ${i + 1}${slide.title ? `: ${slide.title}` : ''}`);
        if (slide.content) parts.push(slide.content);
        parts.push('');
      });
      break;
    }

    default: {
      // Generic serialization for unknown types
      parts.push(JSON.stringify(data, null, 2));
    }
  }

  return parts.join('\n');
}

/**
 * Serializes a CoursePlan to human-readable text for embedding/RAG.
 */
export function serializeCoursePlanToText(
  coursePlan: { title: string; description?: string | null; content: unknown; metadata: unknown }
): string {
  const parts: string[] = [];
  parts.push(`# Plan de cours: ${coursePlan.title}`);
  if (coursePlan.description) parts.push(coursePlan.description);
  parts.push('');

  const meta = coursePlan.metadata as Record<string, unknown> | null;
  if (meta) {
    if (meta.duration) parts.push(`Duree: ${meta.duration}`);
    if (meta.level) parts.push(`Niveau: ${meta.level}`);
    if (meta.target) parts.push(`Public cible: ${meta.target}`);
    if (meta.objectives) {
      parts.push('Objectifs:');
      (meta.objectives as string[]).forEach((obj) => parts.push(`  - ${obj}`));
    }
    parts.push('');
  }

  // ProseMirror content → extract text recursively
  const content = coursePlan.content as Record<string, unknown>;
  if (content && content.type === 'doc' && Array.isArray(content.content)) {
    parts.push(extractProseMirrorText(content.content));
  } else if (typeof content === 'string') {
    parts.push(content);
  } else {
    parts.push(JSON.stringify(content, null, 2));
  }

  return parts.join('\n');
}

/**
 * Extract plain text from ProseMirror JSON nodes.
 */
function extractProseMirrorText(nodes: unknown[]): string {
  const parts: string[] = [];

  for (const node of nodes) {
    const n = node as Record<string, unknown>;
    if (n.type === 'text' && typeof n.text === 'string') {
      parts.push(n.text);
    } else if (n.type === 'heading') {
      const level = (n.attrs as Record<string, unknown>)?.level || 1;
      const text = Array.isArray(n.content) ? extractProseMirrorText(n.content) : '';
      parts.push(`${'#'.repeat(level as number)} ${text}`);
    } else if (n.type === 'paragraph') {
      const text = Array.isArray(n.content) ? extractProseMirrorText(n.content) : '';
      parts.push(text);
    } else if (n.type === 'bulletList' || n.type === 'orderedList') {
      if (Array.isArray(n.content)) {
        n.content.forEach((item: unknown, i: number) => {
          const li = item as Record<string, unknown>;
          const text = Array.isArray(li.content) ? extractProseMirrorText(li.content) : '';
          const prefix = n.type === 'orderedList' ? `${i + 1}.` : '-';
          parts.push(`  ${prefix} ${text}`);
        });
      }
    } else if (Array.isArray(n.content)) {
      parts.push(extractProseMirrorText(n.content));
    }
  }

  return parts.join('\n');
}

/**
 * Convert a widget to a StudioSource with indexed chunks.
 */
export async function convertWidgetToSource(
  studioId: string,
  widgetId: string
): Promise<{ sourceId: string }> {
  // Check for existing source from this widget
  const existing = await prisma.studioSource.findFirst({
    where: { studioId, originWidgetId: widgetId },
  });
  if (existing) {
    return { sourceId: existing.id };
  }

  // Fetch widget
  const widget = await prisma.widget.findUnique({
    where: { id: widgetId },
  });
  if (!widget || widget.studioId !== studioId) {
    throw new Error('Widget not found');
  }

  // Serialize to text
  const text = serializeWidgetToText({
    type: widget.type,
    title: widget.title,
    description: widget.description,
    data: widget.data as Record<string, unknown>,
  });

  // Create source
  const source = await prisma.studioSource.create({
    data: {
      studioId,
      type: 'WIDGET',
      title: `${widget.title} (source)`,
      originWidgetId: widgetId,
      status: 'INDEXING',
    },
  });

  // Chunk and embed
  await chunkAndEmbed(source.id, text, studioId);

  return { sourceId: source.id };
}

/**
 * Convert a CoursePlan to a StudioSource with indexed chunks.
 */
export async function convertCoursePlanToSource(
  studioId: string,
  coursePlanId: string
): Promise<{ sourceId: string }> {
  // Check for existing source from this course plan
  const existing = await prisma.studioSource.findFirst({
    where: { studioId, originCoursePlanId: coursePlanId },
  });
  if (existing) {
    return { sourceId: existing.id };
  }

  // Fetch course plan
  const coursePlan = await prisma.coursePlan.findUnique({
    where: { id: coursePlanId },
  });
  if (!coursePlan || coursePlan.studioId !== studioId) {
    throw new Error('Course plan not found');
  }

  // Serialize to text
  const text = serializeCoursePlanToText({
    title: coursePlan.title,
    description: coursePlan.description,
    content: coursePlan.content,
    metadata: coursePlan.metadata,
  });

  // Create source
  const source = await prisma.studioSource.create({
    data: {
      studioId,
      type: 'WIDGET',
      title: `${coursePlan.title} (source)`,
      originCoursePlanId: coursePlanId,
      status: 'INDEXING',
    },
  });

  // Chunk and embed
  await chunkAndEmbed(source.id, text, studioId);

  return { sourceId: source.id };
}

/**
 * Shared logic: chunk text, generate embeddings, create DB records.
 */
async function chunkAndEmbed(
  sourceId: string,
  text: string,
  studioId: string
): Promise<void> {
  try {
    const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });

    if (chunks.length === 0) {
      // If text is too short to chunk, use as a single chunk
      chunks.push(text);
    }

    const embeddingResults = await generateEmbeddings(chunks, studioId);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddingResults[i]?.embedding;
      if (embedding) {
        const vectorStr = embeddingToVector(embedding);
        await prisma.$executeRawUnsafe(
          `INSERT INTO studio_source_chunks (id, "sourceId", content, embedding, metadata, "chunkIndex", "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3::vector, $4::jsonb, $5, NOW())`,
          sourceId,
          chunks[i],
          vectorStr,
          JSON.stringify({ chunk_index: i }),
          i
        );
      }
    }

    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { status: 'INDEXED' },
    });
  } catch (error) {
    await prisma.studioSource.update({
      where: { id: sourceId },
      data: { status: 'ERROR' },
    });
    throw error;
  }
}
