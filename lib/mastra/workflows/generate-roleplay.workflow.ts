import { LegacyStep as Step, LegacyWorkflow as Workflow } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { generateObject } from 'ai';
import { semanticSearch } from '../../ai/embeddings';
import { getProviderForStudio, type ProviderKey } from '../../ai/providers';

// Roleplay scenario schema — aligned with RolePlayConfig from packages/shared
const RoleplayScenarioSchema = z.object({
  scenario: z.string().describe('Title/summary of the roleplay scenario'),
  context: z.string().optional().describe('Background context for the scenario'),
  roles: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the role (UUID format)'),
      name: z.string().describe('Name/title of the role'),
      description: z.string().describe('Description of the role'),
      personality: z.string().optional().describe('Personality traits of the character'),
      objectives: z.array(z.string()).optional().describe('Objectives for this role'),
      constraints: z.array(z.string()).optional().describe('Constraints or challenges'),
    })
  ).describe('Roles in the scenario'),
  objectives: z.array(z.string()).optional().describe('Overall learning objectives'),
  assignmentMethod: z.enum(['random', 'presenter', 'participant']).describe('How roles are assigned'),
  allowRoleSwitch: z.boolean().optional().describe('Whether participants can switch roles'),
  debriefingEnabled: z.boolean().optional().describe('Whether a debriefing phase is enabled'),
  showLiveResults: z.boolean().optional().describe('Show live results in real-time'),
});

// Input types
export interface RoleplayWorkflowInput {
  studioId: string;
  title: string;
  description?: string;
  sourceIds: string[];
  roleCount: number;
  scenario?: string;
  language: string;
  preferredProvider?: ProviderKey;
}

export interface RoleplayWorkflowOutput {
  success: boolean;
  scenario: z.infer<typeof RoleplayScenarioSchema>;
}

// Step 1: Retrieve relevant content
const retrieverStep = new Step({
  id: 'retriever',
  description: 'Retrieve relevant content for roleplay generation',
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
    const triggerData = context.getStepResult<RoleplayWorkflowInput>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const searchResults = await semanticSearch(
      triggerData.studioId,
      triggerData.title,
      triggerData.sourceIds.length > 0 ? triggerData.sourceIds : undefined,
      8
    );

    return searchResults.map((r) => ({
      id: r.id,
      content: r.content,
      score: r.score,
    }));
  },
});

// Step 2: Generate roleplay scenario
const roleplayGeneratorStep = new Step({
  id: 'roleplayGenerator',
  description: 'Generate roleplay scenario using AI',
  inputSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    roleCount: z.number(),
    scenario: z.string().optional(),
    language: z.string(),
    preferredProvider: z.string().optional(),
  }),
  outputSchema: RoleplayScenarioSchema,
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<RoleplayWorkflowInput>('trigger');
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
      schema: RoleplayScenarioSchema,
      prompt: `Tu es un expert en conception de scenarios de jeux de roles pedagogiques.

Cree un scenario de jeu de roles sur le sujet: "${triggerData.title}"
${triggerData.description ? `Description: ${triggerData.description}` : ''}
${triggerData.scenario ? `Contexte additionnel: ${triggerData.scenario}` : ''}

Nombre de roles: ${triggerData.roleCount}
Langue: ${triggerData.language}

Contenu de reference:
${contextText}

Instructions:
- Le champ 'scenario' doit resumer le scenario en une phrase
- Le champ 'context' doit fournir le contexte detaille
- Chaque role doit avoir un 'id' UUID unique, un 'name', une 'description', des 'personality' traits, des 'objectives' et des 'constraints'
- Le champ 'assignmentMethod' doit etre 'random'
- Le champ 'debriefingEnabled' doit etre true
- Ajoute un champ 'objectives' global avec les apprentissages vises
- Les roles doivent avoir des objectifs parfois conflictuels
- La situation doit permettre une resolution par la negociation ou la collaboration`,
    });

    return result.object;
  },
});

// Workflow definition
const generateRoleplayWorkflowBuilder = new Workflow({
  name: 'Generate Roleplay',
  triggerSchema: z.object({
    studioId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceIds: z.array(z.string()).default([]),
    roleCount: z.number().default(2),
    scenario: z.string().optional(),
    language: z.string().default('fr'),
    preferredProvider: z.string().optional(),
  }),
})
  .step(retrieverStep)
  .then(roleplayGeneratorStep);

export const generateRoleplayWorkflow = generateRoleplayWorkflowBuilder.commit();
