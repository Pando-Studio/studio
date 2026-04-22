// Types for Presentation Generation

export type TPatternId = 'simple' | 'smart-layout' | 'media' | 'interactive';

export interface ITemplatePattern {
  id: TPatternId;
  description: string;
  tags: string[];
  useWhen: string[];
  avoidWhen: string[];
}

// Slide content types
export type TSlideContentType =
  | 'titre'
  | 'subtitle'
  | 'paragraph'
  | 'liste'
  | 'image'
  | 'chiffre-cle';

export interface ISlideListItem {
  subtitle: string;
  content: string;
  number: string | null;
}

export interface ISlideContentElement {
  type: TSlideContentType;
  content: string | string[] | ISlideListItem[];
  metadata: string;
}

export interface IGeneratedSlideFirstStep {
  title: string;
  order: number;
  isInteractive: boolean;
  type: 'text' | 'quiz' | 'atelier' | 'wordcloud';
  widgetRef: { id: string; path: string } | null;
  slideContent: ISlideContentElement[];
  explanation: string;
}

export interface IGeneratedSlideLastStep extends IGeneratedSlideFirstStep {
  patternId: TPatternId;
  slideHtml: string;
  imageUrl?: string;
}

// Workflow input/output types
export interface IPresentationGenerationInput {
  studioId: string;
  presentationId: string;
  title: string;
  sourceIds: string[];
  slideCount: number;
  textDensity: 'minimal' | 'balanced' | 'detailed';
  tone: string;
  imageSource: 'ai' | 'unsplash';
  language: string;
  preferredProvider?: string;
}

export interface IPresentationGenerationOutput {
  success: boolean;
  presentationId: string;
  slides: IGeneratedSlideLastStep[];
  totalSlides: number;
}

// Pattern assignment result
export interface IPatternAssignmentResult {
  slideOrder: number;
  patternId: TPatternId;
}

// Fill pattern result
export interface IFillPatternResult {
  slideOrder: number;
  generatedHtml: string;
  workflowSkipSteps: string[];
}

// Image generation result
export interface IImageGenerationResult {
  slideOrder: number;
  imageUrl: string | null;
  imageDescription?: string;
}

// Smart layout cell for smart-layout pattern
export interface ISmartLayoutCell {
  heading: string;
  content: string;
  icon?: string;
  statistic?: string;
}

// Slide type for database
export interface ISlideData {
  order: number;
  title: string;
  patternId: TPatternId;
  html: string;
  isInteractive: boolean;
  type: 'text' | 'quiz' | 'atelier' | 'wordcloud';
  widgetRef?: { id: string; path: string } | null;
  imageUrl?: string;
  notes?: string;
}

// Generation progress events
export type TGenerationProgressEvent =
  | 'slides:structure:start'
  | 'slides:structure:complete'
  | 'slide:pattern:assigning'
  | 'slide:pattern:assigned'
  | 'slide:filling:start'
  | 'slide:filling:complete'
  | 'slide:icons:finding'
  | 'slide:icons:found'
  | 'slide:image:generating'
  | 'slide:image:generated'
  | 'slide:complete'
  | 'presentation:complete';

export interface IGenerationProgress {
  event: TGenerationProgressEvent;
  slideOrder?: number;
  totalSlides?: number;
  currentSlide?: number;
  message?: string;
}
