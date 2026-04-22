import { z } from 'zod';

/**
 * SlideSpec Schema - v2 architecture
 * Defines the structure of a slide with deterministic rendering
 */

// Asset reference for images
export const AssetRefSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  prompt: z.string().optional(),
  source: z.enum(['ai', 'unsplash', 'upload']).optional(),
  status: z.enum(['pending', 'generating', 'ready', 'error']).optional(),
});

export type AssetRef = z.infer<typeof AssetRefSchema>;

// Grid cell for grid layouts
export const GridCellSchema = z.object({
  heading: z.string(),
  content: z.string(),
  icon: z.string().optional(),
  statistic: z.string().optional(),
});

export type GridCell = z.infer<typeof GridCellSchema>;

// Slide block types - the building blocks of a slide
export const SlideBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heading'),
    level: z.enum(['1', '2', '3']).transform(Number) as unknown as z.ZodLiteral<1 | 2 | 3>,
    text: z.string(),
  }),
  z.object({
    type: z.literal('text'),
    content: z.string(),
    emphasis: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('bullets'),
    items: z.array(z.string()),
  }),
  z.object({
    type: z.literal('numbered'),
    items: z.array(z.string()),
  }),
  z.object({
    type: z.literal('grid'),
    cells: z.array(GridCellSchema),
  }),
  z.object({
    type: z.literal('image'),
    ref: AssetRefSchema,
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal('quote'),
    text: z.string(),
    attribution: z.string().optional(),
  }),
  z.object({
    type: z.literal('statistic'),
    value: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  }),
]);

// Re-define with proper typing for export
export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
  emphasis: z.boolean().optional(),
});

export const BulletsBlockSchema = z.object({
  type: z.literal('bullets'),
  items: z.array(z.string()),
});

export const NumberedBlockSchema = z.object({
  type: z.literal('numbered'),
  items: z.array(z.string()),
});

export const GridBlockSchema = z.object({
  type: z.literal('grid'),
  cells: z.array(GridCellSchema),
});

export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  ref: AssetRefSchema,
  caption: z.string().optional(),
});

export const QuoteBlockSchema = z.object({
  type: z.literal('quote'),
  text: z.string(),
  attribution: z.string().optional(),
});

export const StatisticBlockSchema = z.object({
  type: z.literal('statistic'),
  value: z.string(),
  label: z.string(),
  icon: z.string().optional(),
});

// Union type for all block types
export type SlideBlock =
  | z.infer<typeof HeadingBlockSchema>
  | z.infer<typeof TextBlockSchema>
  | z.infer<typeof BulletsBlockSchema>
  | z.infer<typeof NumberedBlockSchema>
  | z.infer<typeof GridBlockSchema>
  | z.infer<typeof ImageBlockSchema>
  | z.infer<typeof QuoteBlockSchema>
  | z.infer<typeof StatisticBlockSchema>;

// Activity slot for child widgets
export const ActivitySlotSchema = z.object({
  allowed: z.array(z.string()), // e.g., ['quiz', 'wordcloud', 'postit']
  childWidgetId: z.string().optional(),
});

export type ActivitySlot = z.infer<typeof ActivitySlotSchema>;

// Slide intent - determines the purpose of the slide
export const SlideIntentSchema = z.enum([
  'title',      // Title slide (opening)
  'section',    // Section divider
  'content',    // Main content slide
  'summary',    // Summary/conclusion slide
  'interactive' // Interactive activity slide
]);

export type SlideIntent = z.infer<typeof SlideIntentSchema>;

// Slide layout - determines the visual arrangement
export const SlideLayoutSchema = z.enum([
  'simple',       // Title + content, centered or left-aligned
  'two-columns',  // Two column layout
  'media-left',   // Media on left, content on right
  'media-right',  // Media on right, content on left
  'media-center', // Media centered, content below
  'full-media'    // Full-bleed media with overlay text
]);

export type SlideLayout = z.infer<typeof SlideLayoutSchema>;

// Main SlideSpec schema
export const SlideSpecSchema = z.object({
  id: z.string(),
  intent: SlideIntentSchema,
  layout: SlideLayoutSchema,
  blocks: z.array(z.union([
    HeadingBlockSchema,
    TextBlockSchema,
    BulletsBlockSchema,
    NumberedBlockSchema,
    GridBlockSchema,
    ImageBlockSchema,
    QuoteBlockSchema,
    StatisticBlockSchema,
  ])),
  speakerNotes: z.string().optional(),
  assets: z.object({
    heroImage: AssetRefSchema.optional(),
    icons: z.array(z.string()).optional(),
  }).optional(),
  slots: z.object({
    activity: ActivitySlotSchema.optional(),
  }).optional(),
});

export type SlideSpec = z.infer<typeof SlideSpecSchema>;

// Slide summary for deck plan (lightweight version)
export const SlideSummarySchema = z.object({
  order: z.number(),
  title: z.string(),
  intent: SlideIntentSchema,
  keyPoints: z.array(z.string()),
  suggestedLayout: SlideLayoutSchema.optional(),
  hasImage: z.boolean().optional(),
  hasActivity: z.boolean().optional(),
  activityType: z.enum(['quiz', 'wordcloud', 'postit']).optional(),
});

export type SlideSummary = z.infer<typeof SlideSummarySchema>;
