// WidgetType enum values (matches Prisma schema)
export type WidgetType = 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY' | 'PRESENTATION' | 'SLIDE' | 'MULTIPLE_CHOICE' | 'POSTIT' | 'RANKING' | 'OPENTEXT' | 'SEQUENCE' | 'COURSE_MODULE' | 'IMAGE' | 'FAQ' | 'GLOSSARY' | 'SUMMARY' | 'FLASHCARD' | 'TIMELINE' | 'REPORT' | 'DATA_TABLE' | 'AUDIO' | 'VIDEO' | 'MINDMAP' | 'INFOGRAPHIC' | 'SYLLABUS' | 'SESSION_PLAN' | 'PROGRAM_OVERVIEW' | 'CLASS_OVERVIEW' | 'QCM';

/**
 * JSON Schema type definition
 * Subset of JSON Schema Draft 7 for template validation
 */
export interface JSONSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: (string | number | boolean)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  title?: string;
  description?: string;
  additionalProperties?: boolean | JSONSchema;
  $ref?: string;
}

/**
 * Generation template definition
 * Defines how a widget type should be generated from user inputs
 */
export interface GenerationTemplate {
  /** Unique identifier (format: publisher/name, e.g., "qiplim/quiz-interactive") */
  id: string;

  /** Display name of the template */
  name: string;

  /** SemVer version */
  version: string;

  /** Description of what this template generates */
  description?: string;

  /** Widget type this template produces */
  widgetType: WidgetType;

  /** Schema definitions */
  schema: {
    /** JSON Schema for user-provided inputs */
    inputs: JSONSchema;
    /** JSON Schema for the generated activity spec (output validation) */
    activitySpec: JSONSchema;
  };

  /** AI generation configuration */
  generation: {
    /** System prompt for the AI model */
    systemPrompt: string;
    /** User prompt template with {{variable}} placeholders */
    userPromptTemplate: string;
    /** Generation parameters */
    parameters: {
      temperature: number;
      maxTokens: number;
    };
  };

  /** RAG configuration */
  rag: {
    /** Number of chunks to retrieve (default: 10) */
    topK: number;
  };
}

/**
 * Generation request payload
 */
export interface GenerateWidgetRequest {
  /** Template ID to use for generation */
  widgetTemplateId: string;
  /** Widget title */
  title: string;
  /** Widget description (optional) */
  description?: string;
  /** User-provided inputs matching template's schema.inputs */
  inputs: Record<string, unknown>;
  /** Source IDs to use for RAG context */
  sourceIds: string[];
  /** Language for generation */
  language?: string;
  /** Preferred AI provider */
  preferredProvider?: string;
}

/**
 * Generation response payload
 */
export interface GenerateWidgetResponse {
  success: boolean;
  widget: {
    id: string;
    type: WidgetType;
    title: string;
    data: Record<string, unknown>;
    status: string;
  };
  runId: string;
  template: {
    id: string;
    version: string;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Template registry interface
 */
export interface TemplateRegistryInterface {
  get(id: string): GenerationTemplate | undefined;
  list(): GenerationTemplate[];
  has(id: string): boolean;
}
