/**
 * Prompt builder for widget template generation
 * Handles variable substitution in prompt templates
 */

export interface PromptContext {
  /** Widget title */
  title: string;
  /** Widget description */
  description?: string;
  /** User-provided inputs */
  inputs: Record<string, unknown>;
  /** RAG context (concatenated chunks) */
  context: string;
  /** Language for generation */
  language: string;
}

/**
 * Build a prompt from a template string and context
 * Supports {{variable}} and {{inputs.variable}} syntax
 *
 * @example
 * buildPrompt("Generate {{questionCount}} questions about {{title}}", {
 *   title: "Machine Learning",
 *   inputs: { questionCount: 5 }
 * })
 * // Returns: "Generate 5 questions about Machine Learning"
 */
export function buildPrompt(template: string, context: Record<string, unknown>): string {
  // Process Mustache-style conditionals: {{#var}}...{{/var}} (include block if var is truthy)
  let processed = template.replace(
    /\{\{#(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, path, content) => {
      const value = resolvePath(context, path);
      if (value === undefined || value === null || value === '' || value === false) {
        return '';
      }
      return content;
    }
  );

  // Replace {{variable}} placeholders
  processed = processed.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
    const value = resolvePath(context, path);

    if (value === undefined || value === null) {
      return '';
    }

    // Convert arrays to readable format
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Convert objects to JSON
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  });

  return processed;
}

/**
 * Resolve a dot-notation path in an object
 *
 * @example
 * resolvePath({ inputs: { count: 5 } }, "inputs.count") // Returns: 5
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Flatten inputs into a single-level object for easier template substitution
 * This allows {{questionCount}} instead of {{inputs.questionCount}}
 */
export function flattenContext(context: PromptContext): Record<string, unknown> {
  return {
    title: context.title,
    description: context.description ?? '',
    context: context.context,
    language: context.language,
    // Spread inputs at the top level
    ...context.inputs,
    // Also keep inputs nested for explicit access
    inputs: context.inputs,
  };
}

/**
 * Build a prompt with flattened context
 * This is the main function to use for template generation
 */
export function buildPromptFromTemplate(
  template: string,
  context: PromptContext
): string {
  const flatContext = flattenContext(context);
  return buildPrompt(template, flatContext);
}

/**
 * Extract variable names from a template
 * Useful for validation and documentation
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Validate that all required variables are present in context
 */
export function validateTemplateContext(
  template: string,
  context: Record<string, unknown>,
  requiredVariables?: string[]
): { valid: boolean; missing: string[] } {
  const variables = requiredVariables ?? extractTemplateVariables(template);
  const missing: string[] = [];

  for (const variable of variables) {
    const value = resolvePath(context, variable);
    if (value === undefined || value === null) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
