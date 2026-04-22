import type { WidgetKind, Orchestration, Composition } from '@/lib/composition';

// Minimal activity config types (used by type guards below)
interface QuizConfig { questions: { question: string; options: unknown[] }[] }
interface WordCloudConfig { prompt: string }
interface RolePlayConfig { scenario: string; roles: unknown[] }
interface MultipleChoiceConfig { questions: { options: unknown[] }[] }
interface PostItConfig { prompt: string; categories?: unknown[] }
interface RankingConfig { prompt: string; items: unknown[] }
interface OpenTextConfig { prompt: string }

export type WidgetType =
  | 'QUIZ'
  | 'WORDCLOUD'
  | 'ROLEPLAY'
  | 'PRESENTATION'
  | 'SLIDE' // Internal sub-widget of PRESENTATION — not a standalone type
  | 'MULTIPLE_CHOICE'
  | 'POSTIT'
  | 'RANKING'
  | 'OPENTEXT'
  | 'IMAGE'
  | 'SEQUENCE'
  | 'COURSE_MODULE'
  | 'FAQ'
  | 'GLOSSARY'
  | 'SUMMARY'
  | 'FLASHCARD'
  | 'TIMELINE'
  | 'REPORT'
  | 'DATA_TABLE'
  | 'AUDIO'
  | 'VIDEO'
  | 'MINDMAP'
  | 'INFOGRAPHIC'
  | 'SYLLABUS'
  | 'SESSION_PLAN'
  | 'PROGRAM_OVERVIEW'
  | 'CLASS_OVERVIEW'
  | 'QCM';

export interface WidgetData {
  id: string;
  studioId: string;
  type: WidgetType;
  title: string;
  description?: string;
  data: Record<string, unknown>;
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  order?: number;
  kind: WidgetKind;
  parentId?: string;
  slotId?: string;
  composition?: Composition;
  orchestration?: Orchestration;
  children?: WidgetData[];
  createdAt: string;
  updatedAt: string;
}

// Default widget kind per type
export const DEFAULT_WIDGET_KIND: Record<WidgetType, WidgetKind> = {
  QUIZ: 'LEAF',
  WORDCLOUD: 'LEAF',
  ROLEPLAY: 'LEAF',
  PRESENTATION: 'COMPOSED',
  SLIDE: 'LEAF',
  MULTIPLE_CHOICE: 'LEAF',
  POSTIT: 'LEAF',
  RANKING: 'LEAF',
  OPENTEXT: 'LEAF',
  IMAGE: 'LEAF',
  SEQUENCE: 'COMPOSED',
  COURSE_MODULE: 'COMPOSED',
  FAQ: 'LEAF',
  GLOSSARY: 'LEAF',
  SUMMARY: 'LEAF',
  FLASHCARD: 'LEAF',
  TIMELINE: 'LEAF',
  REPORT: 'LEAF',
  DATA_TABLE: 'LEAF',
  AUDIO: 'LEAF',
  VIDEO: 'LEAF',
  MINDMAP: 'LEAF',
  INFOGRAPHIC: 'LEAF',
  SYLLABUS: 'LEAF',
  SESSION_PLAN: 'LEAF',
  PROGRAM_OVERVIEW: 'LEAF',
  CLASS_OVERVIEW: 'LEAF',
  QCM: 'LEAF',
};

// Type guards for widget kind
export function isCompositeWidget(widget: WidgetData): boolean {
  return widget.kind === 'COMPOSED';
}

export function isContainerWidget(widget: WidgetData): boolean {
  return widget.kind === 'COMPOSED';
}

export function isLeafWidget(widget: WidgetData): boolean {
  return widget.kind === 'LEAF';
}

export function hasChildren(widget: WidgetData): boolean {
  return (widget.children?.length ?? 0) > 0;
}

// Type guards for widget data
export function isQuizData(data: Record<string, unknown>): data is QuizConfig & Record<string, unknown> {
  return Array.isArray(data.questions) && data.questions.length > 0 && 'question' in (data.questions[0] as Record<string, unknown>);
}

export function isWordcloudData(data: Record<string, unknown>): data is WordCloudConfig & Record<string, unknown> {
  return typeof data.prompt === 'string';
}

export function isRoleplayData(data: Record<string, unknown>): data is RolePlayConfig & Record<string, unknown> {
  return typeof data.scenario === 'string' && Array.isArray(data.roles);
}

export function isMultipleChoiceData(data: Record<string, unknown>): data is MultipleChoiceConfig & Record<string, unknown> {
  return Array.isArray(data.questions) && data.questions.length > 0 && 'options' in (data.questions[0] as Record<string, unknown>) && Array.isArray(((data.questions[0] as Record<string, unknown>).options));
}

export function isPostItData(data: Record<string, unknown>): data is PostItConfig & Record<string, unknown> {
  return typeof data.prompt === 'string' && (data.categories === undefined || Array.isArray(data.categories));
}

export function isRankingData(data: Record<string, unknown>): data is RankingConfig & Record<string, unknown> {
  return typeof data.prompt === 'string' && Array.isArray(data.items);
}

export function isOpenTextData(data: Record<string, unknown>): data is OpenTextConfig & Record<string, unknown> {
  return typeof data.prompt === 'string' && !Array.isArray(data.items) && !Array.isArray(data.categories);
}

// Props interfaces for Display and Editor components
export interface WidgetDisplayProps {
  data: Record<string, unknown>;
  widget?: WidgetData;
  children?: WidgetData[];
}

export interface WidgetEditorProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  widget?: WidgetData;
  children?: WidgetData[];
  onAddChild?: (slotId: string, type: WidgetType) => Promise<void>;
  onRemoveChild?: (childId: string) => Promise<void>;
  onReorderChildren?: (slotId: string, orderedIds: string[]) => Promise<void>;
}
