import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';

// Wordcloud output schema — aligned with WordCloudConfig from packages/shared
const WordcloudOutputSchema = z.object({
  prompt: z.string().describe('The question or prompt to display to participants'),
  maxWords: z.number().int().optional().describe('Maximum number of words displayed'),
  minWordLength: z.number().int().optional().describe('Minimum character length for a word'),
  maxWordLength: z.number().int().optional().describe('Maximum character length for a word'),
  showLiveResults: z.boolean().optional().describe('Show live results in real-time'),
});

// Input types
export interface WordcloudWorkflowInput {
  studioId: string;
  title: string;
  description?: string;
  sourceIds: string[];
  language: string;
  preferredProvider?: ProviderKey;
}

export interface WordcloudWorkflowOutput {
  success: boolean;
  prompt: string;
  maxWords?: number;
  minWordLength?: number;
  maxWordLength?: number;
  showLiveResults?: boolean;
}

// Step 1: Retrieve relevant content
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve relevant content for wordcloud generation',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    sourceIds: z.array(z.string()),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      score: z.number(),
    })
  ),
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<WordcloudWorkflowInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const searchResults = await semanticSearch(
      triggerData.studioId,
      triggerData.title,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      5
    );

    return searchResults.map((r) => ({
      id: r.id,
      content: r.content,
      score: r.score,
    }));
  },
});

// Step 2: Generate wordcloud question
const wordcloudGeneratorStep = new Step({
  id: 'wordcloudGenerator',
  description: 'Generate wordcloud question using AI',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    language: z.string(),
    preferredProvider: z.string().optional(),
  }),
  outputSchema: WordcloudOutputSchema,
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<WordcloudWorkflowInput>('trigger');
    const retrievedContent = context.getStepResult<
      Array<{ id: string; content: string; score: number }>
    >('retriever');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const contextText = retrievedContent?.map((c) => c.content).join('\n\n') || '';

    const { model } = await getProviderForStudio(
      triggerData.studioId,
      triggerData.preferredProvider
    );

    const result = await generateObject({
      model,
      schema: WordcloudOutputSchema,
      prompt: `Tu es un expert en animation de groupe et creation de contenus interactifs.

Cree une question pour un nuage de mots sur le sujet: "${triggerData.title}"
${triggerData.description ? `Description: ${triggerData.description}` : ''}

Langue: ${triggerData.language}

Contenu de reference:
${contextText}

Instructions:
- Le champ 'prompt' doit contenir une question ouverte et engageante qui invite des reponses en 1-3 mots
- Le champ 'maxWords' doit etre 30
- Le champ 'minWordLength' doit etre 2
- Le champ 'showLiveResults' doit etre true
- Base-toi sur le contenu de reference fourni`,
    });

    return result.object;
  },
});

// Workflow definition
const generateWordcloudWorkflowBuilder = new Workflow({
  name: 'Generate Wordcloud',
  triggerSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceIds: z.array(z.string()).default([]),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(retrieverStep)
  .then(wordcloudGeneratorStep);

export const generateWordcloudWorkflow = generateWordcloudWorkflowBuilder.commit();
