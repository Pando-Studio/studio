import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';

// Slide content schema
const SlideSchema = z.object({
  title: z.string().describe('Slide title'),
  type: z.enum(['title', 'content', 'image', 'quote', 'list', 'comparison']).describe('Slide type'),
  content: z.object({
    heading: z.string().optional(),
    subheading: z.string().optional(),
    paragraphs: z.array(z.string()).optional(),
    bulletPoints: z.array(z.string()).optional(),
    quote: z.string().optional(),
    quoteAuthor: z.string().optional(),
    imagePrompt: z.string().optional(),
    columns: z.array(z.object({
      title: z.string(),
      points: z.array(z.string()),
    })).optional(),
  }).describe('Slide content based on type'),
  notes: z.string().optional().describe('Speaker notes'),
});

const SlidesOutputSchema = z.object({
  slides: z.array(SlideSchema),
  outline: z.array(z.string()).describe('Presentation outline'),
});

// Input types
export interface SlidesWorkflowInput {
  studioId: string;
  title: string;
  description?: string;
  sourceIds: string[];
  slideCount: number;
  textDensity: 'minimal' | 'balanced' | 'detailed';
  tone: string;
  language: string;
  preferredProvider?: ProviderKey;
}

export interface SlidesWorkflowOutput {
  success: boolean;
  slides: z.infer<typeof SlidesOutputSchema>['slides'];
  outline: string[];
}

// Step 1: Retrieve content
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve content for slides generation',
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
    const triggerData = context.getStepResult<SlidesWorkflowInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const searchResults = await semanticSearch(
      triggerData.studioId,
      triggerData.title,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      15 // Get more content for slides
    );

    return searchResults.map((r) => ({
      id: r.id,
      content: r.content,
      score: r.score,
    }));
  },
});

// Step 2: Generate slides
const slidesGeneratorStep = new Step({
  id: 'slidesGenerator',
  description: 'Generate presentation slides using AI',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    slideCount: z.number(),
    textDensity: z.enum(['minimal', 'balanced', 'detailed']),
    tone: z.string(),
    language: z.string(),
    preferredProvider: z.string().optional(),
  }),
  outputSchema: SlidesOutputSchema,
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<SlidesWorkflowInput>('trigger');
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

    const densityInstructions = {
      minimal: 'Utilise des mots-cles et des phrases tres courtes. Maximum 3-4 bullet points par slide.',
      balanced: 'Utilise des phrases courtes et des bullet points. 4-6 elements par slide.',
      detailed: 'Inclus des paragraphes explicatifs en plus des bullet points. Contenu riche.',
    };

    const result = await generateObject({
      model,
      schema: SlidesOutputSchema,
      prompt: `Tu es un expert en creation de presentations professionnelles.

Cree une presentation de ${triggerData.slideCount} slides sur: "${triggerData.title}"
${triggerData.description ? `Description: ${triggerData.description}` : ''}

Ton: ${triggerData.tone}
Densite de texte: ${densityInstructions[triggerData.textDensity]}
Langue: ${triggerData.language}

Contenu de reference:
${contextText}

Instructions:
- La premiere slide doit etre une slide de titre
- Varie les types de slides (content, list, quote, comparison, image)
- Chaque slide doit avoir un titre clair et impactant
- Inclus des notes pour le presentateur
- Pour les slides de type "image", fournis un prompt detaille pour generer l'image
- La structure doit etre logique et progressive
- Termine par une slide de conclusion ou de call-to-action`,
    });

    return result.object;
  },
});

// Workflow definition
const generateSlidesWorkflowBuilder = new Workflow({
  name: 'Generate Slides',
  triggerSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceIds: z.array(z.string()).default([]),
    slideCount: z.number().default(10),
    textDensity: z.enum(['minimal', 'balanced', 'detailed']).default('balanced'),
    tone: z.string().default('professionnel'),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(retrieverStep)
  .then(slidesGeneratorStep);

export const generateSlidesWorkflow = generateSlidesWorkflowBuilder.commit();
