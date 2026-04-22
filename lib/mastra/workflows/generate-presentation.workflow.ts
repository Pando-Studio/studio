import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';
import {
  templateRegistry,
  jsonSchemaToZod,
  buildPromptFromTemplate,
} from '../../widget-templates';
import {
  SlideSpecSchema,
  DeckPlanOutputSchema,
  type SlideSpec,
  type DeckPlanOutput,
  type SlideSummary,
} from '../../presentations/schemas';

/**
 * Presentation Generation Workflow v2
 *
 * Simplified 4-step pipeline:
 * 1. retriever - Semantic search for source content
 * 2. generateDeckPlan - Single LLM call for global structure
 * 3. generateSlideSpecs - Parallel LLM calls for each slide
 * 4. persistAndQueueAssets - Save to DB + queue async image jobs
 */

// Input types
export interface PresentationV2WorkflowInput {
  studioId: string;
  presentationId: string;
  versionId: string;
  title: string;
  description?: string;
  sourceIds: string[];
  slideCount: number;
  textDensity: 'minimal' | 'balanced' | 'detailed';
  tone: 'formel' | 'professionnel' | 'decontracte' | 'pedagogique';
  includeInteractiveWidgets: boolean;
  imageSource: 'none' | 'ai' | 'unsplash';
  targetAudience?: string;
  duration?: number;
  learningObjectives?: string[];
  language: string;
  preferredProvider?: ProviderKey;
}

export interface PresentationV2WorkflowOutput {
  success: boolean;
  presentationId: string;
  versionId: string;
  deckPlan: DeckPlanOutput;
  slideSpecs: SlideSpec[];
  pendingImageJobs: Array<{ slideId: string; imagePrompt: string }>;
}

// Step 1: Retrieve content from sources (RAG)
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve content for presentation generation using semantic search',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceIds: z.array(z.string()),
  }),
  outputSchema: z.object({
    content: z.string(),
    chunks: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        score: z.number(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<PresentationV2WorkflowInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    // Build search query from title and description
    const searchQuery = triggerData.description
      ? `${triggerData.title} ${triggerData.description}`
      : triggerData.title;

    const searchResults = await semanticSearch(
      triggerData.studioId,
      searchQuery,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      20 // Get 20 chunks for comprehensive coverage
    );

    const content = searchResults.map((r) => r.content).join('\n\n---\n\n');

    return {
      content,
      chunks: searchResults.map((r) => ({
        id: r.id,
        content: r.content,
        score: r.score,
      })),
    };
  },
});

// Step 2: Generate Deck Plan (single LLM call for global structure)
const generateDeckPlanStep = new Step({
  id: 'generateDeckPlan',
  description: 'Generate the deck plan with slide summaries using a single LLM call',
  inputSchema: z.object({
    title: z.string(),
    slideCount: z.number(),
    textDensity: z.enum(['minimal', 'balanced', 'detailed']),
    tone: z.enum(['formel', 'professionnel', 'decontracte', 'pedagogique']),
    includeInteractiveWidgets: z.boolean(),
    imageSource: z.enum(['none', 'ai', 'unsplash']),
    language: z.string(),
  }),
  outputSchema: DeckPlanOutputSchema,
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<PresentationV2WorkflowInput>('trigger');
    const retrievedContent = context.getStepResult<{ content: string }>('retriever');

    if (!triggerData || !retrievedContent) {
      throw new Error('Required data not found');
    }

    // Get the presentation template
    const template = templateRegistry.get('qiplim/presentation-from-sources');
    if (!template) {
      throw new Error('Presentation template not found');
    }

    const { model } = await getProviderForStudio(
      triggerData.studioId,
      triggerData.preferredProvider
    );

    // Build prompt from template - all extra params go in inputs
    const userPrompt = buildPromptFromTemplate(template.generation.userPromptTemplate, {
      title: triggerData.title,
      description: triggerData.description,
      language: triggerData.language,
      context: retrievedContent.content,
      inputs: {
        slideCount: triggerData.slideCount,
        textDensity: triggerData.textDensity,
        tone: triggerData.tone,
        includeInteractiveWidgets: triggerData.includeInteractiveWidgets,
        imageSource: triggerData.imageSource,
        targetAudience: triggerData.targetAudience,
        duration: triggerData.duration,
        learningObjectives: triggerData.learningObjectives,
      },
    });

    const result = await generateObject({
      model,
      schema: DeckPlanOutputSchema,
      system: template.generation.systemPrompt,
      prompt: userPrompt,
    });

    return result.object;
  },
});

// Step 3: Generate SlideSpecs in parallel
const generateSlideSpecsStep = new Step({
  id: 'generateSlideSpecs',
  description: 'Generate detailed SlideSpec for each slide in parallel',
  inputSchema: z.object({
    deckPlan: DeckPlanOutputSchema,
  }),
  outputSchema: z.object({
    slideSpecs: z.array(SlideSpecSchema),
  }),
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<PresentationV2WorkflowInput>('trigger');
    const deckPlanResult = context.getStepResult<DeckPlanOutput>('generateDeckPlan');
    const retrievedContent = context.getStepResult<{ content: string }>('retriever');

    if (!triggerData || !deckPlanResult || !retrievedContent) {
      throw new Error('Required data not found');
    }

    // Get the slide template
    const template = templateRegistry.get('qiplim/slide-simple');
    if (!template) {
      throw new Error('Slide template not found');
    }

    const { model } = await getProviderForStudio(
      triggerData.studioId,
      triggerData.preferredProvider
    );

    // Generate slides in parallel with batching (max 5 concurrent)
    const BATCH_SIZE = 5;
    const slides = deckPlanResult.slides;
    const slideSpecs: SlideSpec[] = [];

    for (let i = 0; i < slides.length; i += BATCH_SIZE) {
      const batch = slides.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (slideSummary) => {
          try {
            // Determine layout based on intent and content
            const layoutHint = determineLayoutHint(slideSummary);

            const userPrompt = buildPromptFromTemplate(template.generation.userPromptTemplate, {
              title: slideSummary.title,
              description: `Slide ${slideSummary.order} de la présentation "${deckPlanResult.title}"`,
              language: triggerData.language,
              context: retrievedContent.content,
              inputs: {
                intent: slideSummary.intent,
                layoutHint,
                textDensity: triggerData.textDensity,
                includeImage: slideSummary.hasImage && triggerData.imageSource !== 'none',
                activitySlot: slideSummary.hasActivity ? slideSummary.activityType : 'none',
                keyPoints: slideSummary.keyPoints,
              },
            });

            const result = await generateObject({
              model,
              schema: SlideSpecSchema,
              system: template.generation.systemPrompt,
              prompt: userPrompt,
            });

            // Ensure the ID matches the order
            return {
              ...result.object,
              id: `slide-${slideSummary.order}`,
            };
          } catch (error) {
            console.error(`Error generating slide ${slideSummary.order}:`, error);
            // Return a fallback slide spec
            return createFallbackSlideSpec(slideSummary);
          }
        })
      );

      slideSpecs.push(...batchResults);
    }

    // Sort by slide order (extracted from ID)
    slideSpecs.sort((a, b) => {
      const orderA = parseInt(a.id.replace('slide-', ''), 10);
      const orderB = parseInt(b.id.replace('slide-', ''), 10);
      return orderA - orderB;
    });

    return { slideSpecs };
  },
});

// Step 4: Persist and queue assets
const persistAndQueueAssetsStep = new Step({
  id: 'persistAndQueueAssets',
  description: 'Save slides to database and queue image generation jobs',
  inputSchema: z.object({
    slideSpecs: z.array(SlideSpecSchema),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    slideIds: z.array(z.string()),
    pendingImageJobs: z.array(
      z.object({
        slideId: z.string(),
        imagePrompt: z.string(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<PresentationV2WorkflowInput>('trigger');
    const deckPlanResult = context.getStepResult<DeckPlanOutput>('generateDeckPlan');
    const slideSpecsResult = context.getStepResult<{ slideSpecs: SlideSpec[] }>('generateSlideSpecs');

    if (!triggerData || !deckPlanResult || !slideSpecsResult) {
      throw new Error('Required data not found');
    }

    // Note: Actual database persistence is handled by the worker
    // This step prepares the data for persistence and identifies image jobs

    const pendingImageJobs: Array<{ slideId: string; imagePrompt: string }> = [];

    // Identify slides that need image generation
    if (triggerData.imageSource !== 'none') {
      for (const slideSpec of slideSpecsResult.slideSpecs) {
        if (slideSpec.assets?.heroImage?.prompt) {
          pendingImageJobs.push({
            slideId: slideSpec.id,
            imagePrompt: slideSpec.assets.heroImage.prompt,
          });
        }
      }
    }

    return {
      success: true,
      slideIds: slideSpecsResult.slideSpecs.map((s) => s.id),
      pendingImageJobs,
    };
  },
});

// Helper functions

function determineLayoutHint(slideSummary: { intent: string; hasImage?: boolean; suggestedLayout?: string }): string {
  // Use suggested layout if provided
  if (slideSummary.suggestedLayout) {
    return slideSummary.suggestedLayout;
  }

  // Determine based on intent and content
  switch (slideSummary.intent) {
    case 'title':
      return slideSummary.hasImage ? 'full-media' : 'simple';
    case 'section':
      return 'simple';
    case 'interactive':
      return 'simple';
    case 'summary':
      return 'two-columns';
    case 'content':
    default:
      return slideSummary.hasImage ? 'media-right' : 'simple';
  }
}

function createFallbackSlideSpec(slideSummary: SlideSummary): SlideSpec {
  const layout = slideSummary.suggestedLayout || 'simple';

  return {
    id: `slide-${slideSummary.order}`,
    intent: slideSummary.intent,
    layout: layout as SlideSpec['layout'],
    blocks: [
      {
        type: 'heading',
        level: 1,
        text: slideSummary.title,
      },
      {
        type: 'bullets',
        items: slideSummary.keyPoints,
      },
    ],
    speakerNotes: `Points clés: ${slideSummary.keyPoints.join(', ')}`,
  };
}

// Workflow definition
const generatePresentationV2WorkflowBuilder = new Workflow({
  name: 'Generate Presentation v2',
  triggerSchema: z.object({
    studioId: z.string(),
    presentationId: z.string(),
    versionId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceIds: z.array(z.string()).default([]),
    slideCount: z.number().min(3).max(50).default(10),
    textDensity: z.enum(['minimal', 'balanced', 'detailed']).default('balanced'),
    tone: z.enum(['formel', 'professionnel', 'decontracte', 'pedagogique']).default('professionnel'),
    includeInteractiveWidgets: z.boolean().default(true),
    imageSource: z.enum(['none', 'ai', 'unsplash']).default('ai'),
    targetAudience: z.string().optional(),
    duration: z.number().optional(),
    learningObjectives: z.array(z.string()).optional(),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(retrieverStep)
  .then(generateDeckPlanStep)
  .then(generateSlideSpecsStep)
  .then(persistAndQueueAssetsStep);

export const generatePresentationV2Workflow = generatePresentationV2WorkflowBuilder.commit();

// Export types for worker
export type { DeckPlanOutput, SlideSpec };
