import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';
import {
  templateRegistry,
  jsonSchemaToZod,
  buildPromptFromTemplate,
  type GenerationTemplate,
} from '../../widget-templates';

/**
 * Input for the unified widget generation workflow
 */
export interface WidgetGenerationInput {
  studioId: string;
  templateId: string;
  title: string;
  description?: string;
  inputs: Record<string, unknown>;
  sourceIds: string[];
  language: string;
  preferredProvider?: ProviderKey;
}

/**
 * Output from the unified widget generation workflow
 */
export interface WidgetGenerationOutput {
  success: boolean;
  data: Record<string, unknown>;
  templateId: string;
  templateVersion: string;
}

// Step 1: Load template and validate inputs
const templateLoaderStep = new Step({
  id: 'templateLoader',
  description: 'Load template and validate user inputs',
  inputSchema: z.object({
    templateId: z.string(),
    inputs: z.record(z.unknown()),
  }),
  outputSchema: z.object({
    template: z.object({
      id: z.string(),
      name: z.string(),
      version: z.string(),
      widgetType: z.string(),
      generation: z.object({
        systemPrompt: z.string(),
        userPromptTemplate: z.string(),
        parameters: z.object({
          temperature: z.number(),
          maxTokens: z.number(),
        }),
      }),
      rag: z.object({
        topK: z.number(),
      }),
    }),
    validatedInputs: z.record(z.unknown()),
  }),
  execute: async ({ context }) => {
    const t0 = Date.now();
    const triggerData = context.getStepResult<WidgetGenerationInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    console.log(`[generate-widget] Step 1/3 templateLoader — template=${triggerData.templateId}, title="${triggerData.title}"`);

    // Load template
    const template = templateRegistry.get(triggerData.templateId);
    if (!template) {
      throw new Error(`Template not found: ${triggerData.templateId}`);
    }

    // Validate inputs using template's input schema
    const inputSchema = jsonSchemaToZod(template.schema.inputs);
    const validationResult = inputSchema.safeParse(triggerData.inputs);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      console.error(`[generate-widget] Step 1/3 FAILED — input validation: ${errors}`);
      throw new Error(`Input validation failed: ${errors}`);
    }

    console.log(`[generate-widget] Step 1/3 OK — ${Date.now() - t0}ms, inputs:`, validationResult.data);

    return {
      template: {
        id: template.id,
        name: template.name,
        version: template.version,
        widgetType: template.widgetType,
        generation: template.generation,
        rag: template.rag,
      },
      validatedInputs: validationResult.data as Record<string, unknown>,
    };
  },
});

// Step 2: Retrieve relevant content from sources (RAG)
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve relevant content using semantic search',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    sourceIds: z.array(z.string()),
    topK: z.number(),
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
    const triggerData = context.getStepResult<WidgetGenerationInput>('trigger');
    const loaderResult = context.getStepResult<{
      template: { rag: { topK: number } };
    }>('templateLoader');

    if (!triggerData || !loaderResult) {
      throw new Error('Required data not found');
    }

    const topK = loaderResult.template.rag.topK;

    console.log(`[generate-widget] Step 2/3 retriever — topK=${topK}, sourceIds=${triggerData.sourceIds.length}, query="${triggerData.title}"`);

    // Semantic search across sources
    const searchResults = await semanticSearch(
      triggerData.studioId,
      triggerData.title,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      topK
    );

    console.log(`[generate-widget] Step 2/3 OK — ${Date.now() - t0}ms, ${searchResults.length} chunks retrieved`);

    return searchResults;
  },
});

// Step 3: Generate widget content using AI
const generatorStep = new Step({
  id: 'generator',
  description: 'Generate widget content using AI',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    language: z.string(),
    preferredProvider: z.string().optional(),
  }),
  outputSchema: z.record(z.unknown()),
  execute: async ({ context }) => {
    const t0 = Date.now();
    const triggerData = context.getStepResult<WidgetGenerationInput>('trigger');
    const loaderResult = context.getStepResult<{
      template: GenerationTemplate;
      validatedInputs: Record<string, unknown>;
    }>('templateLoader');
    const retrievedContent = context.getStepResult<
      Array<{ id: string; sourceId: string; content: string; score: number }>
    >('retriever');

    if (!triggerData || !loaderResult) {
      throw new Error('Required data not found');
    }

    const { template, validatedInputs } = loaderResult;

    // Concatenate retrieved content
    const contextText = retrievedContent?.map((c) => c.content).join('\n\n') || '';

    // Build the user prompt from template
    const userPrompt = buildPromptFromTemplate(template.generation.userPromptTemplate, {
      title: triggerData.title,
      description: triggerData.description,
      inputs: validatedInputs,
      context: contextText,
      language: triggerData.language,
    });

    // Get provider
    const { model } = await getProviderForStudio(
      triggerData.studioId,
      triggerData.preferredProvider
    );

    // Convert output schema to Zod (use template from loader step to avoid re-loading)
    const fullTemplate = templateRegistry.get(triggerData.templateId);
    const activitySpec = fullTemplate?.schema.activitySpec;
    if (!activitySpec) {
      throw new Error(`Template activitySpec not found: ${triggerData.templateId}`);
    }
    const outputSchema = jsonSchemaToZod(activitySpec);

    const params = {
      temperature: template.generation.parameters.temperature,
      maxOutputTokens: template.generation.parameters.maxTokens,
    };

    console.log(`[generate-widget] Step 3/3 generator — model=${model.modelId ?? 'unknown'}, temperature=${params.temperature}, maxOutputTokens=${params.maxOutputTokens}`);
    console.log(`[generate-widget] Step 3/3 system prompt (${template.generation.systemPrompt.length} chars)`);
    console.log(`[generate-widget] Step 3/3 user prompt (${userPrompt.length} chars), context (${contextText.length} chars)`);

    let result;
    try {
      result = await generateObject({
        model,
        schema: outputSchema,
        system: template.generation.systemPrompt,
        prompt: userPrompt,
        ...params,
      });
    } catch (err) {
      const elapsed = Date.now() - t0;
      const msg = err instanceof Error ? err.message : String(err);
      const cause = err instanceof Error && err.cause ? ` | cause: ${String(err.cause)}` : '';
      console.error(`[generate-widget] Step 3/3 FAILED — ${elapsed}ms, model=${model.modelId ?? 'unknown'}, error: ${msg}${cause}`);
      throw err;
    }

    const elapsed = Date.now() - t0;
    const output = result.object as Record<string, unknown>;
    const usage = result.usage;
    console.log(`[generate-widget] Step 3/3 OK — ${elapsed}ms, usage: ${usage?.inputTokens ?? '?'} input + ${usage?.outputTokens ?? '?'} output tokens`);

    return output;
  },
});

// Workflow definition
const generateWidgetWorkflowBuilder = new Workflow({
  name: 'Generate Widget (Unified)',
  triggerSchema: z.object({
    studioId: z.string(),
    templateId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    inputs: z.record(z.unknown()).default({}),
    sourceIds: z.array(z.string()).default([]),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(templateLoaderStep)
  .then(retrieverStep)
  .then(generatorStep);

export const generateWidgetWorkflow = generateWidgetWorkflowBuilder.commit();
