import type { GenerationTemplate, TemplateRegistryInterface } from './types';

// Import templates as JSON
import quizTemplate from './templates/quiz-interactive.json';
import roleplayTemplate from './templates/roleplay-conversation.json';
import wordcloudTemplate from './templates/wordcloud-interactive.json';
import slideSimpleTemplate from './templates/slide-simple.json';
import presentationFromSourcesTemplate from './templates/presentation-from-sources.json';
import multipleChoiceTemplate from './templates/multiple-choice-interactive.json';
import postitTemplate from './templates/postit-brainstorm.json';
import rankingTemplate from './templates/ranking-prioritization.json';
import opentextTemplate from './templates/opentext-reflection.json';
import imageGenerationTemplate from './templates/image-generation.json';
import faqTemplate from './templates/faq-extraction.json';
import glossaryTemplate from './templates/glossary-extraction.json';
import summaryTemplate from './templates/summary-structured.json';
import flashcardTemplate from './templates/flashcard-learning.json';
import timelineTemplate from './templates/timeline-chronological.json';
import reportTemplate from './templates/report-document.json';
import dataTableTemplate from './templates/data-table-extraction.json';
import mindmapTemplate from './templates/mindmap-extraction.json';
import infographicTemplate from './templates/infographic-visual.json';
import syllabusTemplate from './templates/syllabus-generation.json';
import sessionPlanTemplate from './templates/session-plan-generation.json';
import programOverviewTemplate from './templates/program-overview-generation.json';
import classOverviewTemplate from './templates/class-overview-generation.json';
import qcmTemplate from './templates/qcm-evaluation.json';
import audioPodcastTemplate from './templates/audio-podcast.json';
import videoSlideshowTemplate from './templates/video-slideshow.json';

/**
 * Widget Template Registry
 * Singleton that manages all available widget generation templates
 */
class WidgetTemplateRegistry implements TemplateRegistryInterface {
  private templates = new Map<string, GenerationTemplate>();

  constructor() {
    // Register built-in templates
    this.register(quizTemplate as GenerationTemplate);
    this.register(roleplayTemplate as GenerationTemplate);
    this.register(wordcloudTemplate as GenerationTemplate);
    this.register(slideSimpleTemplate as GenerationTemplate);
    this.register(presentationFromSourcesTemplate as GenerationTemplate);
    this.register(multipleChoiceTemplate as GenerationTemplate);
    this.register(postitTemplate as GenerationTemplate);
    this.register(rankingTemplate as GenerationTemplate);
    this.register(opentextTemplate as GenerationTemplate);
    this.register(imageGenerationTemplate as GenerationTemplate);
    this.register(faqTemplate as GenerationTemplate);
    this.register(glossaryTemplate as GenerationTemplate);
    this.register(summaryTemplate as GenerationTemplate);
    this.register(flashcardTemplate as GenerationTemplate);
    this.register(timelineTemplate as GenerationTemplate);
    this.register(reportTemplate as GenerationTemplate);
    this.register(dataTableTemplate as GenerationTemplate);
    this.register(mindmapTemplate as GenerationTemplate);
    this.register(infographicTemplate as GenerationTemplate);
    this.register(syllabusTemplate as GenerationTemplate);
    this.register(sessionPlanTemplate as GenerationTemplate);
    this.register(programOverviewTemplate as GenerationTemplate);
    this.register(classOverviewTemplate as GenerationTemplate);
    this.register(qcmTemplate as GenerationTemplate);
    this.register(audioPodcastTemplate as GenerationTemplate);
    this.register(videoSlideshowTemplate as GenerationTemplate);
  }

  /**
   * Register a new template
   */
  register(template: GenerationTemplate): void {
    if (this.templates.has(template.id)) {
      console.warn(`Template ${template.id} is already registered. Overwriting.`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID
   */
  get(id: string): GenerationTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Check if a template exists
   */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * List all registered templates
   */
  list(): GenerationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * List templates by widget type
   */
  listByType(widgetType: string): GenerationTemplate[] {
    return this.list().filter((t) => t.widgetType === widgetType);
  }

  /**
   * Get template IDs
   */
  getIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get template count
   */
  get count(): number {
    return this.templates.size;
  }
}

// Export singleton instance
export const templateRegistry = new WidgetTemplateRegistry();

// Export class for testing
export { WidgetTemplateRegistry };
