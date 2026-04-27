// ============================================
// Widget Config — Zod schemas + registry
//
// Follows the same pattern as Engage's activity-configs.ts.
// Each widget type has a strict Zod schema. Configs are
// validated at write time and typed-cast at read time.
// ============================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export const QuizQuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  isCorrect: z.boolean().default(false),
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['single', 'multiple']).default('single'),
  options: z.array(QuizQuestionOptionSchema).min(2),
  explanation: z.string().optional(),
  timeLimit: z.number().optional(),
  points: z.number().default(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export const QuizConfigSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
  showCorrectAnswer: z.boolean().default(false),
  showImmediateFeedback: z.boolean().default(false),
  showStatistics: z.boolean().default(false),
  showLeaderboard: z.boolean().default(false),
});

export type QuizQuestionOption = z.infer<typeof QuizQuestionOptionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizConfig = z.infer<typeof QuizConfigSchema>;

// ---------------------------------------------------------------------------
// Multiple Choice
// ---------------------------------------------------------------------------

export const MultipleChoiceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  isCorrect: z.boolean().default(false),
});

export const MultipleChoiceConfigSchema = z.object({
  question: z.string().default(''),
  options: z.array(MultipleChoiceOptionSchema).min(2),
  allowMultiple: z.boolean().default(false),
  showCorrectAnswer: z.boolean().default(false),
  explanation: z.string().optional(),
});

export type MultipleChoiceOption = z.infer<typeof MultipleChoiceOptionSchema>;
export type MultipleChoiceConfig = z.infer<typeof MultipleChoiceConfigSchema>;

// ---------------------------------------------------------------------------
// QCM (ensemble de questions a choix multiple)
// ---------------------------------------------------------------------------

export const QcmQuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  isCorrect: z.boolean().default(false),
});

export const QcmQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(QcmQuestionOptionSchema).min(2),
  allowMultiple: z.boolean().default(false),
  explanation: z.string().optional(),
  points: z.number().default(1),
});

export const QcmConfigSchema = z.object({
  questions: z.array(QcmQuestionSchema).min(1),
  showCorrectAnswer: z.boolean().default(false),
  showImmediateFeedback: z.boolean().default(false),
});

export type QcmQuestionOption = z.infer<typeof QcmQuestionOptionSchema>;
export type QcmQuestion = z.infer<typeof QcmQuestionSchema>;
export type QcmConfig = z.infer<typeof QcmConfigSchema>;

// ---------------------------------------------------------------------------
// Wordcloud
// ---------------------------------------------------------------------------

export const WordcloudConfigSchema = z.object({
  prompt: z.string().default(''),
  maxWords: z.number().default(30),
  minWordLength: z.number().default(2),
  maxWordLength: z.number().optional(),
});

export type WordcloudConfig = z.infer<typeof WordcloudConfigSchema>;

// ---------------------------------------------------------------------------
// Post-it
// ---------------------------------------------------------------------------

export const PostitConfigSchema = z.object({
  prompt: z.string().default(''),
  categories: z.array(z.string()).default([]),
  maxPostIts: z.number().optional(),
  allowVoting: z.boolean().default(false),
  allowPhotoCapture: z.boolean().default(true),
});

export type PostitConfig = z.infer<typeof PostitConfigSchema>;

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export const RankingItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const RankingConfigSchema = z.object({
  prompt: z.string().default(''),
  items: z.array(RankingItemSchema).min(2),
  timeLimit: z.number().optional(),
});

export type RankingItem = z.infer<typeof RankingItemSchema>;
export type RankingConfig = z.infer<typeof RankingConfigSchema>;

// ---------------------------------------------------------------------------
// Open Text
// ---------------------------------------------------------------------------

export const OpenTextConfigSchema = z.object({
  prompt: z.string().default(''),
  placeholder: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  timeLimit: z.number().optional(),
});

export type OpenTextConfig = z.infer<typeof OpenTextConfigSchema>;

// ---------------------------------------------------------------------------
// Roleplay
// ---------------------------------------------------------------------------

export const RoleplayRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  personality: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
});

export const RoleplayConfigSchema = z.object({
  scenario: z.string().default(''),
  context: z.string().optional(),
  roles: z.array(RoleplayRoleSchema).min(1),
  objectives: z.array(z.string()).optional(),
  assignmentMethod: z.enum(['random', 'presenter', 'participant']).default('random'),
  allowRoleSwitch: z.boolean().default(false),
  debriefingEnabled: z.boolean().default(false),
});

export type RoleplayRole = z.infer<typeof RoleplayRoleSchema>;
export type RoleplayConfig = z.infer<typeof RoleplayConfigSchema>;

// ---------------------------------------------------------------------------
// Image (Studio-only)
// ---------------------------------------------------------------------------

export const ImageConfigSchema = z.object({
  prompt: z.string().default(''),
  style: z.enum(['photo', 'illustration', '3d', 'art']).default('photo'),
  aspectRatio: z.enum(['16:9', '1:1', '4:3', '9:16']).default('16:9'),
  imageUrl: z.string().optional(),
  model: z.string().optional(),
});

export type ImageConfig = z.infer<typeof ImageConfigSchema>;

// ---------------------------------------------------------------------------
// Schema Registry
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Presentation (COMPOSED)
// ---------------------------------------------------------------------------

export const PresentationConfigSchema = z.object({
  title: z.string().default(''),
  theme: z.string().default('professional-blue'),
  estimatedDuration: z.string().optional(), // e.g. "20min"
});

export type PresentationConfig = z.infer<typeof PresentationConfigSchema>;

// ---------------------------------------------------------------------------
// Sequence (COMPOSED — ordered list of children)
// ---------------------------------------------------------------------------

export const SequenceConfigSchema = z.object({
  title: z.string().default(''),
  description: z.string().optional(),
});

export type SequenceConfig = z.infer<typeof SequenceConfigSchema>;

// ---------------------------------------------------------------------------
// Course Module (COMPOSED — structured course)
// ---------------------------------------------------------------------------

export const CourseModuleConfigSchema = z.object({
  title: z.string().default(''),
  description: z.string().optional(),
  duration: z.string().optional(),
  level: z.string().optional(),
  objectives: z.array(z.string()).default([]),
});

export type CourseModuleConfig = z.infer<typeof CourseModuleConfigSchema>;

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const FaqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const FaqConfigSchema = z.object({
  title: z.string().default(''),
  items: z.array(FaqItemSchema).min(1),
});

export type FaqItem = z.infer<typeof FaqItemSchema>;
export type FaqConfig = z.infer<typeof FaqConfigSchema>;

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------

export const GlossaryTermSchema = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string(),
});

export const GlossaryConfigSchema = z.object({
  title: z.string().default(''),
  terms: z.array(GlossaryTermSchema).min(1),
  sortAlphabetically: z.boolean().default(true),
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type GlossaryConfig = z.infer<typeof GlossaryConfigSchema>;

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export const SummarySectionSchema = z.object({
  heading: z.string(),
  bullets: z.array(z.string()).min(1),
});

export const SummaryConfigSchema = z.object({
  title: z.string().default(''),
  sections: z.array(SummarySectionSchema).min(1),
  sourceDocuments: z.array(z.string()).optional(),
});

export type SummarySection = z.infer<typeof SummarySectionSchema>;
export type SummaryConfig = z.infer<typeof SummaryConfigSchema>;

// ---------------------------------------------------------------------------
// Flashcard
// ---------------------------------------------------------------------------

export const FlashcardItemSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
});

export const FlashcardConfigSchema = z.object({
  title: z.string().default(''),
  cardCount: z.enum(['moins', 'standard', 'plus']).default('standard'),
  difficulty: z.enum(['facile', 'moyen', 'difficile']).default('moyen'),
  cards: z.array(FlashcardItemSchema).min(1),
  shuffleOnStart: z.boolean().default(true),
  showProgress: z.boolean().default(true),
  enableSelfScoring: z.boolean().default(true),
});

export type FlashcardItem = z.infer<typeof FlashcardItemSchema>;
export type FlashcardConfig = z.infer<typeof FlashcardConfigSchema>;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const TimelineEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

export const TimelineConfigSchema = z.object({
  title: z.string().default(''),
  events: z.array(TimelineEventSchema).min(1),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type TimelineConfig = z.infer<typeof TimelineConfigSchema>;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export const ReportCitationSchema = z.object({
  text: z.string(),
  sourceId: z.string().optional(),
  sourceTitle: z.string().optional(),
});

export const ReportConfigSchema = z.object({
  title: z.string().default(''),
  format: z.enum(['synthesis', 'study-guide', 'blog-article', 'custom']).default('synthesis'),
  language: z.string().default('fr'),
  instructions: z.string().optional(),
  content: z.string().default(''),
  wordCount: z.number().optional(),
  sourceCount: z.number().optional(),
  citations: z.array(ReportCitationSchema).optional(),
});

export type ReportCitation = z.infer<typeof ReportCitationSchema>;
export type ReportConfig = z.infer<typeof ReportConfigSchema>;

// ---------------------------------------------------------------------------
// Data Table
// ---------------------------------------------------------------------------

export const DataTableColumnSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number', 'date', 'boolean']).default('string'),
});

export const DataTableConfigSchema = z.object({
  title: z.string().default(''),
  instructions: z.string().optional(),
  columns: z.array(DataTableColumnSchema).min(1),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))).default([]),
  exportUrl: z.string().optional(),
});

export type DataTableColumn = z.infer<typeof DataTableColumnSchema>;
export type DataTableConfig = z.infer<typeof DataTableConfigSchema>;

// ---------------------------------------------------------------------------
// Audio (podcast / audio overview from sources)
// ---------------------------------------------------------------------------

export const AudioSegmentSchema = z.object({
  id: z.string(),
  speakerId: z.string(),
  text: z.string(),
  type: z.enum(['intro', 'discussion', 'example', 'summary', 'transition', 'outro']).default('discussion'),
});

export const AudioConfigSchema = z.object({
  title: z.string().default(''),
  audioUrl: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.number().optional(), // seconds
  voices: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['host', 'expert', 'narrator']).default('narrator'),
  })).optional(),
  language: z.string().default('fr'),
  script: z.object({
    segments: z.array(AudioSegmentSchema),
    chapters: z.array(z.object({
      title: z.string(),
      startSegmentId: z.string(),
    })).optional(),
  }).optional(),
  generationConfig: z.object({
    targetDuration: z.enum(['3', '5', '10', '15']).default('5'),
    tone: z.enum(['casual', 'professional', 'academic']).default('professional'),
    style: z.enum(['interview', 'discussion', 'lecture', 'debate']).default('discussion'),
    speakerCount: z.enum(['1', '2']).default('2'),
    ttsProvider: z.enum(['openai', 'mistral', 'elevenlabs', 'gemini']).default('openai'),
  }).optional(),
});

export type AudioSegment = z.infer<typeof AudioSegmentSchema>;
export type AudioConfig = z.infer<typeof AudioConfigSchema>;

// ---------------------------------------------------------------------------
// Video (video summary / overview)
// ---------------------------------------------------------------------------

export const VideoSlideSchema = z.object({
  id: z.string(),
  order: z.number(),
  layout: z.enum(['title', 'content', 'bullets', 'comparison', 'quote', 'image']).default('content'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  content: z.string().optional(),
  imagePrompt: z.string().optional(),
  imageUrl: z.string().optional(),
  narration: z.string(),
  durationHint: z.number().default(10), // seconds
  audioUrl: z.string().optional(),
});

export const VideoConfigSchema = z.object({
  title: z.string().default(''),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.number().optional(), // seconds
  chapters: z.array(z.object({
    id: z.string(),
    title: z.string(),
    timestamp: z.number(), // seconds
  })).optional(),
  language: z.string().default('fr'),
  script: z.object({
    slides: z.array(VideoSlideSchema),
  }).optional(),
  generationConfig: z.object({
    mode: z.enum(['slideshow', 'cinematic']).default('slideshow'),
    slideCount: z.number().min(3).max(30).default(8),
    targetDuration: z.enum(['0.5', '1', '3', '5', '10']).default('3'),
    tone: z.enum(['casual', 'professional', 'academic']).default('professional'),
    ttsProvider: z.enum(['openai', 'mistral', 'elevenlabs', 'gemini']).default('openai'),
    includeSubtitles: z.boolean().default(true),
    includeSlideImages: z.boolean().default(false),
    imageProvider: z.enum(['gemini', 'dall-e-3']).default('gemini'),
    cinematicProvider: z.enum(['kling', 'runway', 'sora', 'veo']).default('kling'),
  }).optional(),
});

export type VideoSlide = z.infer<typeof VideoSlideSchema>;
export type VideoConfig = z.infer<typeof VideoConfigSchema>;

// ---------------------------------------------------------------------------
// Mindmap
// ---------------------------------------------------------------------------

export const MindmapNodeSchema: z.ZodType<{
  id: string;
  label: string;
  children?: Array<{ id: string; label: string; children?: unknown[] }>;
}> = z.object({
  id: z.string(),
  label: z.string(),
  children: z.lazy(() => z.array(MindmapNodeSchema)).optional(),
});

export const MindmapConfigSchema = z.object({
  title: z.string().default(''),
  root: MindmapNodeSchema,
});

export type MindmapNode = z.infer<typeof MindmapNodeSchema>;
export type MindmapConfig = z.infer<typeof MindmapConfigSchema>;

// ---------------------------------------------------------------------------
// Infographic
// ---------------------------------------------------------------------------

export const InfographicSectionSchema = z.object({
  id: z.string(),
  type: z.enum(['stat', 'text', 'list', 'comparison']).default('text'),
  title: z.string().optional(),
  content: z.string().optional(),
  value: z.string().optional(), // for stat type
  items: z.array(z.string()).optional(), // for list type
});

export const InfographicConfigSchema = z.object({
  title: z.string().default(''),
  subtitle: z.string().optional(),
  sections: z.array(InfographicSectionSchema).min(1),
  colorScheme: z.string().default('blue'),
});

export type InfographicSection = z.infer<typeof InfographicSectionSchema>;
export type InfographicConfig = z.infer<typeof InfographicConfigSchema>;

// ---------------------------------------------------------------------------
// Syllabus (programme structure — COMPOSED)
// ---------------------------------------------------------------------------

export const SyllabusConfigSchema = z.object({
  title: z.string().default(''),
  content: z.string().default(''),
  duration: z.string().optional(),
  level: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  locale: z.enum(['fr-lmd', 'fr-secondary', 'fr-pro', 'generic']).default('generic'),
});

export type SyllabusConfig = z.infer<typeof SyllabusConfigSchema>;

// ---------------------------------------------------------------------------
// Session Plan (seance — COMPOSED)
// ---------------------------------------------------------------------------

export const SessionPlanConfigSchema = z.object({
  title: z.string().default(''),
  content: z.string().default(''),
  duration: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
});

export type SessionPlanConfig = z.infer<typeof SessionPlanConfigSchema>;

// ---------------------------------------------------------------------------
// Program Overview (formation superieure — COMPOSED)
// ---------------------------------------------------------------------------

export const ProgramOverviewConfigSchema = z.object({
  title: z.string().default(''),
  content: z.string().default(''),
  credits: z.number().optional(),
  duration: z.string().optional(),
  level: z.string().optional(),
  objectives: z.array(z.string()).default([]),
});

export type ProgramOverviewConfig = z.infer<typeof ProgramOverviewConfigSchema>;

// ---------------------------------------------------------------------------
// Class Overview (lycee — COMPOSED)
// ---------------------------------------------------------------------------

export const ClassOverviewConfigSchema = z.object({
  title: z.string().default(''),
  content: z.string().default(''),
  subject: z.string().optional(),
  grade: z.string().optional(),
  objectives: z.array(z.string()).default([]),
});

export type ClassOverviewConfig = z.infer<typeof ClassOverviewConfigSchema>;

// ---------------------------------------------------------------------------
// Schema Registry
// ---------------------------------------------------------------------------

/** Widget types that have config schemas */
export const WidgetConfigSchemas = {
  QUIZ: QuizConfigSchema,
  MULTIPLE_CHOICE: MultipleChoiceConfigSchema,
  WORDCLOUD: WordcloudConfigSchema,
  POSTIT: PostitConfigSchema,
  RANKING: RankingConfigSchema,
  OPENTEXT: OpenTextConfigSchema,
  ROLEPLAY: RoleplayConfigSchema,
  IMAGE: ImageConfigSchema,
  PRESENTATION: PresentationConfigSchema,
  SEQUENCE: SequenceConfigSchema,
  COURSE_MODULE: CourseModuleConfigSchema,
  FAQ: FaqConfigSchema,
  GLOSSARY: GlossaryConfigSchema,
  SUMMARY: SummaryConfigSchema,
  FLASHCARD: FlashcardConfigSchema,
  TIMELINE: TimelineConfigSchema,
  REPORT: ReportConfigSchema,
  DATA_TABLE: DataTableConfigSchema,
  AUDIO: AudioConfigSchema,
  VIDEO: VideoConfigSchema,
  MINDMAP: MindmapConfigSchema,
  INFOGRAPHIC: InfographicConfigSchema,
  SYLLABUS: SyllabusConfigSchema,
  SESSION_PLAN: SessionPlanConfigSchema,
  PROGRAM_OVERVIEW: ProgramOverviewConfigSchema,
  CLASS_OVERVIEW: ClassOverviewConfigSchema,
  QCM: QcmConfigSchema,
} as const;

export type WidgetConfigType = keyof typeof WidgetConfigSchemas;

export type WidgetConfigMap = {
  QUIZ: QuizConfig;
  MULTIPLE_CHOICE: MultipleChoiceConfig;
  WORDCLOUD: WordcloudConfig;
  POSTIT: PostitConfig;
  RANKING: RankingConfig;
  OPENTEXT: OpenTextConfig;
  ROLEPLAY: RoleplayConfig;
  IMAGE: ImageConfig;
  PRESENTATION: PresentationConfig;
  SEQUENCE: SequenceConfig;
  COURSE_MODULE: CourseModuleConfig;
  FAQ: FaqConfig;
  GLOSSARY: GlossaryConfig;
  SUMMARY: SummaryConfig;
  FLASHCARD: FlashcardConfig;
  TIMELINE: TimelineConfig;
  REPORT: ReportConfig;
  DATA_TABLE: DataTableConfig;
  AUDIO: AudioConfig;
  VIDEO: VideoConfig;
  MINDMAP: MindmapConfig;
  INFOGRAPHIC: InfographicConfig;
  SYLLABUS: SyllabusConfig;
  SESSION_PLAN: SessionPlanConfig;
  PROGRAM_OVERVIEW: ProgramOverviewConfig;
  CLASS_OVERVIEW: ClassOverviewConfig;
  QCM: QcmConfig;
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Validate + parse a raw widget config. Use at every write path.
 * Returns null for types without a schema (PRESENTATION, SLIDE, SEQUENCE, COURSE_MODULE).
 */
export function parseWidgetData<T extends WidgetConfigType>(
  type: T,
  raw: unknown,
): WidgetConfigMap[T] {
  return WidgetConfigSchemas[type].parse(raw) as WidgetConfigMap[T];
}

/**
 * Try to parse — returns { data } on success or { error } on failure.
 * Useful for AI-generated output that may be malformed.
 */
export function safeParseWidgetData<T extends WidgetConfigType>(
  type: T,
  raw: unknown,
): { data: WidgetConfigMap[T] } | { error: string } {
  const schema = WidgetConfigSchemas[type];
  if (!schema) return { data: raw as WidgetConfigMap[T] };
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues.map((i) => i.message).join(', ') };
  }
  return { data: result.data as WidgetConfigMap[T] };
}

/**
 * Typed cast without validation. Safe for reads (config was validated at write time).
 */
export function getWidgetConfig<T extends WidgetConfigType>(
  type: T,
  data: unknown,
): WidgetConfigMap[T] {
  return data as WidgetConfigMap[T];
}

/**
 * Check if a widget type has a config schema.
 */
export function hasConfigSchema(type: string): type is WidgetConfigType {
  return type in WidgetConfigSchemas;
}

/**
 * Returns a valid minimal default config for a given widget type.
 */
export function getDefaultWidgetConfig<T extends WidgetConfigType>(
  type: T,
): WidgetConfigMap[T] {
  const defaults: Record<WidgetConfigType, unknown> = {
    QUIZ: {
      questions: [{
        id: crypto.randomUUID(),
        question: '',
        type: 'single' as const,
        options: [
          { id: crypto.randomUUID(), label: '', isCorrect: false },
          { id: crypto.randomUUID(), label: '', isCorrect: false },
        ],
        points: 1,
      }],
      showCorrectAnswer: false,
      showImmediateFeedback: false,
      showStatistics: false,
      showLeaderboard: false,
    },
    MULTIPLE_CHOICE: {
      question: '',
      options: [
        { id: crypto.randomUUID(), label: '', isCorrect: false },
        { id: crypto.randomUUID(), label: '', isCorrect: false },
      ],
      allowMultiple: false,
      showCorrectAnswer: false,
    },
    WORDCLOUD: { prompt: '', maxWords: 30, minWordLength: 2 },
    POSTIT: { prompt: '', categories: [], allowVoting: false, allowPhotoCapture: true },
    RANKING: {
      prompt: '',
      items: [
        { id: crypto.randomUUID(), label: '' },
        { id: crypto.randomUUID(), label: '' },
      ],
    },
    OPENTEXT: { prompt: '' },
    ROLEPLAY: {
      scenario: '',
      roles: [{ id: crypto.randomUUID(), name: '', description: '' }],
      assignmentMethod: 'random' as const,
      debriefingEnabled: false,
    },
    IMAGE: { prompt: '', style: 'photo' as const, aspectRatio: '16:9' as const },
    PRESENTATION: { title: '', theme: 'professional-blue' },
    SEQUENCE: { title: '' },
    COURSE_MODULE: { title: '', objectives: [] },
    FAQ: {
      title: '',
      items: [{ id: crypto.randomUUID(), question: '', answer: '' }],
    },
    GLOSSARY: {
      title: '',
      terms: [{ id: crypto.randomUUID(), term: '', definition: '' }],
      sortAlphabetically: true,
    },
    SUMMARY: {
      title: '',
      sections: [{ heading: '', bullets: [''] }],
    },
    FLASHCARD: {
      title: '',
      cardCount: 'standard' as const,
      difficulty: 'moyen' as const,
      cards: [{ id: crypto.randomUUID(), front: '', back: '' }],
      shuffleOnStart: true,
      showProgress: true,
      enableSelfScoring: true,
    },
    TIMELINE: {
      title: '',
      events: [{ id: crypto.randomUUID(), date: '', title: '' }],
    },
    REPORT: {
      title: '',
      format: 'synthesis' as const,
      language: 'fr',
      content: '',
    },
    DATA_TABLE: {
      title: '',
      columns: [{ id: crypto.randomUUID(), label: '', type: 'string' as const }],
      rows: [],
    },
    AUDIO: {
      title: '',
      language: 'fr',
    },
    VIDEO: {
      title: '',
      language: 'fr',
    },
    MINDMAP: {
      title: '',
      root: { id: crypto.randomUUID(), label: '' },
    },
    INFOGRAPHIC: {
      title: '',
      sections: [{ id: crypto.randomUUID(), type: 'text' as const }],
      colorScheme: 'blue',
    },
    SYLLABUS: {
      title: '',
      content: '',
      objectives: [],
      prerequisites: [],
      locale: 'generic' as const,
    },
    SESSION_PLAN: {
      title: '',
      content: '',
      objectives: [],
      materials: [],
    },
    PROGRAM_OVERVIEW: {
      title: '',
      content: '',
      objectives: [],
    },
    CLASS_OVERVIEW: {
      title: '',
      content: '',
      objectives: [],
    },
    QCM: {
      questions: [{
        id: crypto.randomUUID(),
        question: '',
        options: [
          { id: crypto.randomUUID(), label: '', isCorrect: false },
          { id: crypto.randomUUID(), label: '', isCorrect: false },
        ],
        allowMultiple: false,
        points: 1,
      }],
      showCorrectAnswer: false,
      showImmediateFeedback: false,
    },
  };
  return defaults[type] as WidgetConfigMap[T];
}

/**
 * Strip sensitive fields (isCorrect, explanation) before sending to participants.
 * Used when deploying widgets to Engage live sessions.
 */
export function sanitizeForParticipant<T extends WidgetConfigType>(
  type: T,
  config: WidgetConfigMap[T],
): unknown {
  if (type === 'MULTIPLE_CHOICE') {
    const mc = config as MultipleChoiceConfig;
    return {
      ...mc,
      options: mc.options.map(({ isCorrect: _, ...o }) => o),
    };
  }
  if (type === 'QCM') {
    const qcm = config as QcmConfig;
    return {
      ...qcm,
      questions: qcm.questions.map((q) => ({
        ...q,
        explanation: undefined,
        options: q.options.map(({ isCorrect: _, ...o }) => o),
      })),
    };
  }
  if (type === 'QUIZ') {
    const q = config as QuizConfig;
    return {
      ...q,
      questions: q.questions.map((question) => ({
        ...question,
        explanation: undefined,
        options: question.options.map(({ isCorrect: _, ...o }) => o),
      })),
    };
  }
  return config;
}
