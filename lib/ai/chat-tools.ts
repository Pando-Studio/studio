import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { templateRegistry } from '@/lib/widget-templates/registry';
import type { GenerationTemplate, JSONSchema } from '@/lib/widget-templates/types';

// ---------------------------------------------------------------------------
// Tool metadata — needsApproval flag
// ---------------------------------------------------------------------------

/** Metadata attached to each generated tool */
export interface ToolMeta {
  templateId: string;
  templateName: string;
  /** When true, the frontend must ask user approval before executing */
  needsApproval: boolean;
}

/** Maps tool name -> metadata (includes needsApproval) */
const toolMetaMap = new Map<string, ToolMeta>();

/**
 * Check whether a tool requires user approval before execution.
 */
export function toolNeedsApproval(toolName: string): boolean {
  return toolMetaMap.get(toolName)?.needsApproval ?? false;
}

/**
 * Get full metadata for a tool.
 */
export function getToolMeta(toolName: string): ToolMeta | undefined {
  return toolMetaMap.get(toolName);
}

// ---------------------------------------------------------------------------
// JSON Schema -> Zod conversion
// ---------------------------------------------------------------------------

/**
 * Converts a JSON Schema property definition to a Zod schema.
 * Supports string (with enum), integer, number, boolean, and array of strings.
 */
function jsonSchemaPropertyToZod(prop: JSONSchema, required: boolean): z.ZodTypeAny {
  const description = prop.description ?? prop.title;

  if (prop.enum && prop.type === 'string') {
    const enumValues = prop.enum as [string, ...string[]];
    let schema: z.ZodTypeAny = z.enum(enumValues);
    if (prop.default !== undefined) {
      schema = schema.default(prop.default);
    }
    if (!required) {
      schema = schema.optional();
    }
    if (description) {
      schema = schema.describe(description);
    }
    return schema;
  }

  if (prop.type === 'integer' || prop.type === 'number') {
    let schema: z.ZodTypeAny = z.number();
    if (prop.minimum !== undefined) {
      schema = (schema as z.ZodNumber).min(prop.minimum);
    }
    if (prop.maximum !== undefined) {
      schema = (schema as z.ZodNumber).max(prop.maximum);
    }
    if (prop.default !== undefined) {
      schema = schema.default(prop.default as number);
    }
    if (!required) {
      schema = schema.optional();
    }
    if (description) {
      schema = schema.describe(description);
    }
    return schema;
  }

  if (prop.type === 'boolean') {
    let schema: z.ZodTypeAny = z.boolean();
    if (prop.default !== undefined) {
      schema = schema.default(prop.default as boolean);
    }
    if (!required) {
      schema = schema.optional();
    }
    if (description) {
      schema = schema.describe(description);
    }
    return schema;
  }

  if (prop.type === 'array' && prop.items?.type === 'string') {
    let schema: z.ZodTypeAny = z.array(z.string());
    if (!required) {
      schema = schema.optional();
    }
    if (description) {
      schema = schema.describe(description);
    }
    return schema;
  }

  // Default: string
  {
    let schema: z.ZodTypeAny = z.string();
    if (prop.default !== undefined) {
      schema = schema.default(prop.default as string);
    }
    if (!required) {
      schema = schema.optional();
    }
    if (description) {
      schema = schema.describe(description);
    }
    return schema;
  }
}

/**
 * Converts a template's input JSON Schema into a Zod object schema.
 * Always includes `title` (string, required).
 */
function templateInputsToZodSchema(template: GenerationTemplate): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {
    title: z.string().describe('Titre du contenu a generer'),
  };

  const inputSchema = template.schema.inputs;
  const requiredFields = new Set(inputSchema.required ?? []);

  if (inputSchema.properties) {
    for (const [key, prop] of Object.entries(inputSchema.properties)) {
      // Skip if already defined (e.g. 'title')
      if (key in shape) continue;
      shape[key] = jsonSchemaPropertyToZod(prop, requiredFields.has(key));
    }
  }

  return z.object(shape);
}

// ---------------------------------------------------------------------------
// Tool name helpers
// ---------------------------------------------------------------------------

/**
 * Converts a template ID like "qiplim/quiz-interactive" to a tool name
 * like "generate_quiz_interactive".
 */
function templateIdToToolName(templateId: string): string {
  const slug = templateId.split('/').pop() ?? templateId;
  return `generate_${slug.replace(/-/g, '_')}`;
}

/**
 * Converts a tool name like "generate_quiz_interactive" back to a template ID
 * like "qiplim/quiz-interactive".
 */
export function toolNameToTemplateId(toolName: string): string | null {
  const entry = toolMetaMap.get(toolName);
  return entry?.templateId ?? null;
}

// ---------------------------------------------------------------------------
// Build tools from registry
// ---------------------------------------------------------------------------

/**
 * Builds AI SDK tools from all templates in the widget registry.
 * Each template becomes a tool named `generate_{slug}`.
 * All generation tools are marked with `needsApproval: true` so the
 * frontend can ask the user before executing them.
 */
function buildWidgetToolsFromRegistry(): ToolSet {
  const tools: ToolSet = {};

  for (const template of templateRegistry.list()) {
    const toolName = templateIdToToolName(template.id);
    const zodSchema = templateInputsToZodSchema(template);
    const description = template.description ?? template.name;

    tools[toolName] = tool({
      description,
      inputSchema: zodSchema,
    });

    toolMetaMap.set(toolName, {
      templateId: template.id,
      templateName: template.name,
      needsApproval: true, // All generation tools require approval
    });
  }

  return tools;
}

// ---------------------------------------------------------------------------
// Plan step schema (shared with execute-plan API)
// ---------------------------------------------------------------------------

export const planStepSchema = z.object({
  order: z.number(),
  widgetType: z.string().describe('Type du widget a generer'),
  title: z.string(),
  description: z.string().optional(),
  dependsOnStep: z.number().optional().describe('Numero du step dont celui-ci depend (cascade)'),
  useParentContent: z.boolean().optional().describe('Utiliser le contenu du widget parent comme source'),
});

export type PlanStep = z.infer<typeof planStepSchema>;

export const generationPlanSchema = z.object({
  planTitle: z.string().describe('Titre du plan'),
  planDescription: z.string().describe('Description courte du plan'),
  steps: z.array(planStepSchema).describe('Liste ordonnee des widgets a generer'),
});

export type GenerationPlan = z.infer<typeof generationPlanSchema>;

// ---------------------------------------------------------------------------
// Build tools
// ---------------------------------------------------------------------------

/**
 * Builds the `propose_generation_plan` tool.
 * This is a special tool (not auto-generated from templates) that lets the
 * LLM propose a multi-widget generation plan for user approval.
 */
function buildPlanTool(): ToolSet {
  const planTool = tool({
    description:
      'Propose un plan de generation de plusieurs widgets. Utilise quand l\'utilisateur demande de creer un ensemble coherent (module complet, programme, etc.)',
    inputSchema: generationPlanSchema,
  });

  toolMetaMap.set('propose_generation_plan', {
    templateId: '__plan__',
    templateName: 'Plan de generation',
    needsApproval: true, // always ask user validation
  });

  return { propose_generation_plan: planTool };
}

// Build once at module load
export const widgetGenerationTools: ToolSet = {
  ...buildWidgetToolsFromRegistry(),
  ...buildPlanTool(),
};

// ---------------------------------------------------------------------------
// Derived exports for the frontend
// ---------------------------------------------------------------------------

export type WidgetToolName = string;

export interface ToolCallData {
  toolName: string;
  args: Record<string, unknown>;
}

/** Human-readable labels for generate buttons, keyed by tool name */
export const toolLabels: Record<string, string> = {};
for (const [toolName, entry] of toolMetaMap.entries()) {
  toolLabels[toolName] = `Generer : ${entry.templateName}`;
}

/** Maps tool name -> template ID for the unified generation endpoint */
export const toolTemplateIds: Record<string, string> = {};
for (const [toolName, entry] of toolMetaMap.entries()) {
  toolTemplateIds[toolName] = entry.templateId;
}

/**
 * Returns the list of available tool names for documentation / logging.
 */
export function getAvailableToolNames(): string[] {
  return Object.keys(widgetGenerationTools);
}

/**
 * Returns a compact summary of available tools for injection into the system prompt.
 */
export function getToolsSummary(): string {
  const lines: string[] = [];
  for (const [toolName, entry] of toolMetaMap.entries()) {
    lines.push(`- ${toolName}: ${entry.templateName}`);
  }
  lines.push('');
  lines.push('Pour generer plusieurs widgets en cascade (ex: un programme complet avec syllabus, seances et quiz), utilise propose_generation_plan.');
  return lines.join('\n');
}
