import { z } from 'zod';
import { SlideSummarySchema, type SlideSummary } from './slide-spec';

/**
 * PresentationSpec Schema - v2 architecture
 * Defines the structure of a presentation with deck plan
 */

// Theme configuration
export const ThemeConfigSchema = z.object({
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().default('Inter'),
  headingFont: z.string().optional(),
  backgroundStyle: z.enum(['solid', 'gradient', 'pattern']).optional(),
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

// Navigation settings
export const NavigationConfigSchema = z.object({
  viewerFollowsSpeaker: z.boolean().default(true),
  allowBackward: z.boolean().default(true),
  showSlideNumbers: z.boolean().default(true),
  showProgress: z.boolean().default(true),
});

export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;

// Deck plan - the high-level structure of the presentation
export const DeckPlanSchema = z.object({
  narrative: z.string(), // Overall narrative/story arc
  targetAudience: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  estimatedDuration: z.number().optional(), // in minutes
  slideSummaries: z.array(SlideSummarySchema),
});

export type DeckPlan = z.infer<typeof DeckPlanSchema>;

// Generation config for v2 presentations
export const PresentationGenerationConfigSchema = z.object({
  slideCount: z.number().min(3).max(50).default(10),
  textDensity: z.enum(['minimal', 'balanced', 'detailed']).default('balanced'),
  tone: z.enum(['formel', 'professionnel', 'decontracte', 'pedagogique']).default('professionnel'),
  includeInteractiveWidgets: z.boolean().default(true),
  imageSource: z.enum(['none', 'ai', 'unsplash']).default('ai'),
  targetAudience: z.string().optional(),
  duration: z.number().min(5).max(120).optional(), // in minutes
  language: z.string().default('fr'),
});

export type PresentationGenerationConfig = z.infer<typeof PresentationGenerationConfigSchema>;

// Main PresentationSpec schema
export const PresentationSpecSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  theme: ThemeConfigSchema.default({}),
  deckPlan: DeckPlanSchema,
  navigation: NavigationConfigSchema.default({}),
  metadata: z.object({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    version: z.number().default(1),
    sourceIds: z.array(z.string()).optional(),
    generationConfig: PresentationGenerationConfigSchema.optional(),
  }).optional(),
});

export type PresentationSpec = z.infer<typeof PresentationSpecSchema>;

// Deck plan output schema for AI generation
export const DeckPlanOutputSchema = z.object({
  title: z.string(),
  narrative: z.string(),
  targetAudience: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  estimatedDuration: z.number().optional(),
  slides: z.array(z.object({
    order: z.number(),
    title: z.string(),
    intent: z.enum(['title', 'section', 'content', 'summary', 'interactive']),
    keyPoints: z.array(z.string()),
    suggestedLayout: z.enum(['simple', 'two-columns', 'media-left', 'media-right', 'media-center', 'full-media']).optional(),
    hasImage: z.boolean().optional(),
    hasActivity: z.boolean().optional(),
    activityType: z.enum(['quiz', 'wordcloud', 'postit']).optional(),
  })),
});

export type DeckPlanOutput = z.infer<typeof DeckPlanOutputSchema>;
