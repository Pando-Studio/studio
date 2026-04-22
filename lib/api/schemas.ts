import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function validateBody<O, I = unknown>(
  schema: z.ZodType<O, z.ZodTypeDef, I>,
  body: unknown,
): { data: O } | { error: string; status: 400 } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    return { error: message, status: 400 };
  }
  return { data: result.data };
}

// ---------------------------------------------------------------------------
// Studios
// ---------------------------------------------------------------------------

export const createStudioSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateStudioSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  settings: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  mode: z.enum(['ASK', 'PLAN', 'AGENT']).optional().transform((v) => v ?? 'ASK'),
  sourceIds: z.array(z.string()).optional().transform((v) => v ?? []),
  conversationId: z.string().nullable().optional().transform((v) => v ?? undefined),
});

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

export const createWidgetSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required').max(200),
  data: z.record(z.unknown()).default({}),
  kind: z.enum(['LEAF', 'COMPOSED']).default('LEAF'),
  status: z.string().default('DRAFT'),
  composition: z.record(z.unknown()).optional(),
  orchestration: z.record(z.unknown()).optional(),
});

export const updateWidgetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: z.record(z.unknown()).optional(),
  status: z.string().optional(),
  kind: z.string().optional(),
  parentId: z.string().optional(),
  slotId: z.string().optional(),
  composition: z.record(z.unknown()).optional(),
  orchestration: z.record(z.unknown()).optional(),
});

export const generateWidgetSchema = z.object({
  existingWidgetId: z.string().optional(),
  widgetTemplateId: z.string().min(1, 'Template ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  inputs: z.record(z.unknown()).optional().transform((v) => v ?? {}),
  sourceIds: z.array(z.string()).optional().transform((v) => v ?? []),
  language: z.string().optional().transform((v) => v ?? 'fr'),
  preferredProvider: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Generation (per-type)
// ---------------------------------------------------------------------------

const baseGenerationFields = {
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  sourceIds: z.array(z.string()).optional().transform((v) => v ?? []),
  language: z.string().optional().transform((v) => v ?? 'fr'),
  preferredProvider: z.string().optional(),
};

export const generateQuizSchema = z.object(baseGenerationFields).extend({
  questionCount: z.number().int().min(1).max(50).optional().transform((v) => v ?? 5),
  answersPerQuestion: z.number().int().min(2).max(6).optional().transform((v) => v ?? 4),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().transform((v) => v ?? 'medium'),
});

export const generateWordcloudSchema = z.object(baseGenerationFields);

export const generateRoleplaySchema = z.object(baseGenerationFields).extend({
  roleCount: z.number().int().min(1).max(10).optional().transform((v) => v ?? 2),
  scenario: z.string().max(2000).optional(),
});

export const generatePresentationSchema = z.object(baseGenerationFields).extend({
  slideCount: z.number().int().min(5).max(30).optional().transform((v) => v ?? 10),
  textDensity: z.enum(['minimal', 'balanced', 'detailed']).optional().transform((v) => v ?? 'balanced'),
  tone: z.string().optional().transform((v) => v ?? 'professionnel'),
  imageSource: z.enum(['ai', 'unsplash']).optional().transform((v) => v ?? 'ai'),
});

export const generateCoursePlanSchema = z.object({
  courseTitle: z.string().max(200).optional(),
  courseDescription: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  duration: z.string().optional().transform((v) => v ?? '5'),
  target: z.string().optional(),
  sector: z.string().optional(),
  level: z.string().optional(),
  prerequisites: z.string().optional(),
  style: z.string().optional(),
  objectives: z.array(z.string()).optional().transform((v) => v ?? []),
  sourceIds: z.array(z.string()).optional().transform((v) => v ?? []),
  language: z.string().optional().transform((v) => v ?? 'fr'),
  preferredProvider: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export const addSourceSchema = z.union([
  z.object({
    documentId: z.string().min(1),
  }),
  z.object({
    type: z.enum(['WEB', 'YOUTUBE']),
    url: z.string().url('Invalid URL'),
    title: z.string().min(1, 'Title is required').max(200),
  }),
]);

export const sourceFromWidgetSchema = z
  .object({
    widgetId: z.string().optional(),
    coursePlanId: z.string().optional(),
  })
  .refine((d) => d.widgetId || d.coursePlanId, {
    message: 'widgetId or coursePlanId is required',
  });

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const updateSettingsSchema = z.object({
  preferredProvider: z.string().nullable().optional(),
  preferredModel: z.string().optional(),
});

export const saveProviderSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  apiKey: z.string().min(1, 'API key is required'),
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export const favoriteSchema = z
  .object({
    widgetId: z.string().optional(),
    coursePlanId: z.string().optional(),
  })
  .refine((d) => d.widgetId || d.coursePlanId, {
    message: 'widgetId or coursePlanId is required',
  });

// ---------------------------------------------------------------------------
// Course Plans
// ---------------------------------------------------------------------------

export const updateCoursePlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export const deployToEngageSchema = z.object({
  widgetIds: z.array(z.string()).optional(),
  title: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
});
