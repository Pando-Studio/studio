import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';

// Quiz question schema — aligned with QuizConfig from packages/shared
const QuizQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question (UUID format)'),
  question: z.string().describe('The quiz question text'),
  type: z.enum(['single', 'multiple', 'text']).describe('Question type'),
  options: z.array(z.string()).min(2).max(6).describe('Array of possible answer texts'),
  correctAnswer: z.string().describe('The correct answer text (must match one of the options)'),
  explanation: z.string().optional().describe('Explanation of the correct answer'),
  timeLimit: z.number().int().min(5).max(300).optional().describe('Per-question timer in seconds'),
  points: z.number().int().min(0).optional().describe('Points awarded for correct answer'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level'),
});

const QuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema),
  showImmediateFeedback: z.boolean().optional(),
  showCorrectAnswer: z.boolean().optional(),
  showStatistics: z.boolean().optional(),
  showLeaderboard: z.boolean().optional(),
  showLiveResults: z.boolean().optional(),
});

// Input types
export interface QuizWorkflowInput {
  studioId: string;
  title: string;
  description?: string;
  sourceIds: string[];
  questionCount: number;
  answersPerQuestion: number;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  preferredProvider?: ProviderKey;
}

export interface QuizWorkflowOutput {
  success: boolean;
  questions: z.infer<typeof QuizOutputSchema>['questions'];
  sources: Array<{ id: string; content: string }>;
}

// Step 1: Retrieve relevant content from sources
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve relevant content for quiz generation',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    sourceIds: z.array(z.string()),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      sourceId: z.string(),
      content: z.string(),
      score: z.number(),
    })
  ),
  execute: async ({ context }) => {
    const t0 = Date.now();
    const triggerData = context.getStepResult<QuizWorkflowInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    console.log(`[generate-quiz] Step 1/2 retriever — query="${triggerData.title}", sourceIds=${triggerData.sourceIds.length}`);

    // Semantic search across all sources
    const searchResults = await semanticSearch(
      triggerData.studioId,
      triggerData.title,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      10 // Get top 10 chunks
    );

    console.log(`[generate-quiz] Step 1/2 OK — ${Date.now() - t0}ms, ${searchResults.length} chunks`);

    return searchResults;
  },
});

// Step 2: Generate quiz questions
const quizGeneratorStep = new Step({
  id: 'quizGenerator',
  description: 'Generate quiz questions using AI',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    questionCount: z.number(),
    answersPerQuestion: z.number(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    language: z.string(),
    preferredProvider: z.string().optional(),
  }),
  outputSchema: QuizOutputSchema,
  execute: async ({ context }) => {
    const t0 = Date.now();
    const triggerData = context.getStepResult<QuizWorkflowInput>('trigger');
    const retrievedContent = context.getStepResult<
      Array<{ id: string; sourceId: string; content: string; score: number }>
    >('retriever');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    // Concatenate retrieved content
    const contextText = retrievedContent
      ?.map((c) => c.content)
      .join('\n\n') || '';

    // Get provider
    const { model } = await getProviderForStudio(
      triggerData.studioId,
      triggerData.preferredProvider
    );

    console.log(`[generate-quiz] Step 2/2 generator — model=${model.modelId ?? 'unknown'}, questions=${triggerData.questionCount}, difficulty=${triggerData.difficulty}, context=${contextText.length} chars`);

    // Generate quiz
    const result = await generateObject({
      model,
      schema: QuizOutputSchema,
      prompt: `Tu es un expert en creation de quiz pedagogiques.

Cree un quiz de ${triggerData.questionCount} questions sur le sujet: "${triggerData.title}"
${triggerData.description ? `Description: ${triggerData.description}` : ''}

Niveau de difficulte: ${triggerData.difficulty}
Nombre d'options par question: ${triggerData.answersPerQuestion}
Langue: ${triggerData.language}

Contenu de reference:
${contextText}

Instructions:
- Chaque question doit avoir un champ 'id' unique (format UUID v4)
- Chaque question doit avoir un champ 'type' valant 'single'
- Chaque question doit avoir exactement ${triggerData.answersPerQuestion} options (tableau de strings)
- Le champ 'correctAnswer' doit contenir le texte exact d'une des options
- Chaque question doit avoir un champ 'explanation' pour la reponse correcte
- Chaque question doit avoir un champ 'difficulty' (easy, medium, hard)
- Chaque question doit avoir un champ 'points' (1 par defaut)
- Les questions doivent etre progressives en difficulte
- Base-toi uniquement sur le contenu de reference fourni`,
    });

    const elapsed = Date.now() - t0;
    const usage = result.usage;
    console.log(`[generate-quiz] Step 2/2 OK — ${elapsed}ms, usage: ${usage?.inputTokens ?? '?'} input + ${usage?.outputTokens ?? '?'} output tokens`);

    return result.object;
  },
});

// Workflow definition
const generateQuizWorkflowBuilder = new Workflow({
  name: 'Generate Quiz',
  triggerSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceIds: z.array(z.string()),
    questionCount: z.number().default(5),
    answersPerQuestion: z.number().default(4),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(retrieverStep)
  .then(quizGeneratorStep);

export const generateQuizWorkflow = generateQuizWorkflowBuilder.commit();
