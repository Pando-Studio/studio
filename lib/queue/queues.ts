import { Queue } from 'bullmq';
import { connectionOptions } from './connection';

// Lazy initialization to avoid Redis connection during build
let sourceAnalysisQueue: Queue | null = null;
let widgetGenerationQueue: Queue | null = null;
let presentationGenerationQueue: Queue | null = null;
let presentationV2GenerationQueue: Queue | null = null;
let slideImageGenerationQueue: Queue | null = null;
let coursePlanGenerationQueue: Queue | null = null;
let deepResearchQueue: Queue | null = null;

export function getSourceAnalysisQueue(): Queue {
  if (!sourceAnalysisQueue) {
    sourceAnalysisQueue = new Queue('studio-source-analysis', {
      connection: connectionOptions,
    });
  }
  return sourceAnalysisQueue;
}

export function getWidgetGenerationQueue(): Queue {
  if (!widgetGenerationQueue) {
    widgetGenerationQueue = new Queue('studio-widget-generation', {
      connection: connectionOptions,
    });
  }
  return widgetGenerationQueue;
}

export function getPresentationGenerationQueue(): Queue {
  if (!presentationGenerationQueue) {
    presentationGenerationQueue = new Queue('studio-presentation-generation', {
      connection: connectionOptions,
    });
  }
  return presentationGenerationQueue;
}

export function getPresentationV2GenerationQueue(): Queue {
  if (!presentationV2GenerationQueue) {
    presentationV2GenerationQueue = new Queue('studio-presentation-v2-generation', {
      connection: connectionOptions,
    });
  }
  return presentationV2GenerationQueue;
}

export function getSlideImageGenerationQueue(): Queue {
  if (!slideImageGenerationQueue) {
    slideImageGenerationQueue = new Queue('studio-slide-image-generation', {
      connection: connectionOptions,
    });
  }
  return slideImageGenerationQueue;
}

export function getCoursePlanGenerationQueue(): Queue {
  if (!coursePlanGenerationQueue) {
    coursePlanGenerationQueue = new Queue('studio-course-plan-generation', {
      connection: connectionOptions,
    });
  }
  return coursePlanGenerationQueue;
}

export function getDeepResearchQueue(): Queue {
  if (!deepResearchQueue) {
    deepResearchQueue = new Queue('studio-deep-research', {
      connection: connectionOptions,
    });
  }
  return deepResearchQueue;
}

// Job types for Source Analysis
export interface SourceAnalysisJob {
  sourceId: string;
  studioId: string;
  filename: string;
  url: string;
  s3Key?: string;
  type: 'DOCUMENT' | 'WEB' | 'YOUTUBE' | 'AUDIO' | 'VIDEO';
}

export interface SourceAnalysisResult {
  success: boolean;
  sourceId: string;
  chunksCount?: number;
  error?: string;
}

// Job types for Widget Generation
export interface WidgetGenerationJob {
  runId: string;
  widgetId: string;
  studioId: string;
  templateId: string;
  title: string;
  description?: string;
  inputs: Record<string, unknown>;
  sourceIds: string[];
  language: string;
  preferredProvider?: string;
}

export interface WidgetGenerationResult {
  success: boolean;
  runId: string;
  widgetId: string;
  data?: Record<string, unknown>;
  error?: string;
}

// Job types for Presentation Generation
export interface PresentationGenerationJob {
  presentationId: string;
  studioId: string;
  runId: string;
  sourceIds: string[];
  config: {
    title: string;
    slideCount: number;
    textDensity: 'minimal' | 'balanced' | 'detailed';
    tone: string;
    imageSource: 'ai' | 'unsplash';
    language: string;
    preferredProvider?: string;
  };
}

export interface PresentationGenerationResult {
  success: boolean;
  presentationId: string;
  slidesCount?: number;
  slides?: Array<{
    id: string;
    order: number;
    title: string;
    patternId: string;
  }>;
  error?: string;
}

// Job types for Presentation Generation v2
export interface PresentationV2GenerationJob {
  presentationId: string;
  versionId: string;
  studioId: string;
  runId: string;
  sourceIds: string[];
  config: {
    title: string;
    description?: string;
    slideCount: number;
    textDensity: 'minimal' | 'balanced' | 'detailed';
    tone: 'formel' | 'professionnel' | 'decontracte' | 'pedagogique';
    includeInteractiveWidgets: boolean;
    imageSource: 'none' | 'ai' | 'unsplash';
    targetAudience?: string;
    duration?: number;
    learningObjectives?: string[];
    language: string;
    preferredProvider?: string;
  };
}

export interface PresentationV2GenerationResult {
  success: boolean;
  presentationId: string;
  versionId: string;
  slidesCount?: number;
  slides?: Array<{
    id: string;
    order: number;
    title: string;
    intent: string;
    layout: string;
  }>;
  pendingImageJobs?: number;
  error?: string;
}

// Job types for Slide Image Generation
export interface SlideImageGenerationJob {
  slideId: string;
  widgetId?: string;
  presentationId: string;
  studioId: string;
  imagePrompt: string;
  source: 'ai' | 'unsplash';
  position: 'hero' | 'left' | 'right' | 'center';
}

export interface SlideImageGenerationResult {
  success: boolean;
  slideId: string;
  imageUrl?: string;
  error?: string;
}

// Job types for Course Plan Generation
export interface CoursePlanGenerationJob {
  runId: string;
  studioId: string;
  sourceIds: string[];
  config: {
    courseTitle?: string;
    courseDescription?: string;
    instructions?: string;
    duration?: string;
    target?: 'student' | 'professional' | 'freelance' | 'public';
    sector?: string;
    level?: 'beginner' | 'intermediate' | 'expert';
    prerequisites?: string;
    style?: string;
    objectives?: string[];
    language: string;
    preferredProvider?: string;
  };
}

export interface CoursePlanGenerationResult {
  success: boolean;
  runId: string;
  coursePlanId?: string;
  coursePlan?: {
    title: string;
    description: string;
    content: unknown; // ProseMirror JSON
    metadata: {
      duration: string;
      target: string;
      level: string;
      style?: string;
      objectives: string[];
      sector?: string;
      prerequisites?: string;
    };
  };
  error?: string;
}

// Job types for Deep Research
export interface DeepResearchJob {
  runId: string;
  studioId: string;
  query: string;
  language: 'fr' | 'en';
  depth: 'standard' | 'deep';
}

export interface DeepResearchResult {
  success: boolean;
  runId: string;
  pagesFound?: number;
  pagesRetained?: number;
  summary?: string;
  error?: string;
}
