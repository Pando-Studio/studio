import type { ComponentType } from 'react';
import type { WidgetDisplayProps, WidgetEditorProps, WidgetType } from './types';
import { GenericWidgetDisplay } from './GenericWidgetDisplay';
import { GenericWidgetEditor } from './GenericWidgetEditor';
import { QuizDisplay } from './quiz/QuizDisplay';
import { QuizEditor } from './quiz/QuizEditor';
import { QuizPlayer } from './quiz/QuizPlayer';
import { WordcloudDisplay } from './wordcloud/WordcloudDisplay';
import { WordcloudEditor } from './wordcloud/WordcloudEditor';
import { RoleplayDisplay } from './roleplay/RoleplayDisplay';
import { RoleplayEditor } from './roleplay/RoleplayEditor';
import { MultipleChoiceDisplay } from './multiple-choice/MultipleChoiceDisplay';
import { MultipleChoiceEditor } from './multiple-choice/MultipleChoiceEditor';
import { PostitDisplay } from './postit/PostitDisplay';
import { PostitEditor } from './postit/PostitEditor';
import { RankingDisplay } from './ranking/RankingDisplay';
import { RankingEditor } from './ranking/RankingEditor';
import { OpentextDisplay } from './opentext/OpentextDisplay';
import { OpentextEditor } from './opentext/OpentextEditor';
import { SequenceDisplay } from './sequence/SequenceDisplay';
import { SequenceEditor } from './sequence/SequenceEditor';
import { CourseModuleDisplay } from './course-module/CourseModuleDisplay';
import { CourseModuleEditor } from './course-module/CourseModuleEditor';
import { ImageDisplay } from './image/ImageDisplay';
import { ImageEditor } from './image/ImageEditor';
import { FaqDisplay } from './faq/FaqDisplay';
import { FaqEditor } from './faq/FaqEditor';
import { GlossaryDisplay } from './glossary/GlossaryDisplay';
import { GlossaryEditor } from './glossary/GlossaryEditor';
import { SummaryDisplay } from './summary/SummaryDisplay';
import { SummaryEditor } from './summary/SummaryEditor';
import { FlashcardDisplay } from './flashcard/FlashcardDisplay';
import { FlashcardEditor } from './flashcard/FlashcardEditor';
import { TimelineDisplay } from './timeline/TimelineDisplay';
import { TimelineEditor } from './timeline/TimelineEditor';
import { ReportDisplay } from './report/ReportDisplay';
import { ReportEditor } from './report/ReportEditor';
import { DataTableDisplay } from './data-table/DataTableDisplay';
import { DataTableEditor } from './data-table/DataTableEditor';
import { AudioDisplay } from './audio/AudioDisplay';
import { AudioEditor } from './audio/AudioEditor';
import { VideoDisplay } from './video/VideoDisplay';
import { VideoEditor } from './video/VideoEditor';
import { MindmapDisplay } from './mindmap/MindmapDisplay';
import { MindmapEditor } from './mindmap/MindmapEditor';
import { InfographicDisplay } from './infographic/InfographicDisplay';
import { InfographicEditor } from './infographic/InfographicEditor';
import { SyllabusDisplay } from './syllabus/SyllabusDisplay';
import { SyllabusEditor } from './syllabus/SyllabusEditor';
import { SessionPlanDisplay } from './session-plan/SessionPlanDisplay';
import { SessionPlanEditor } from './session-plan/SessionPlanEditor';
import { ProgramOverviewDisplay } from './program-overview/ProgramOverviewDisplay';
import { ProgramOverviewEditor } from './program-overview/ProgramOverviewEditor';
import { ClassOverviewDisplay } from './class-overview/ClassOverviewDisplay';
import { ClassOverviewEditor } from './class-overview/ClassOverviewEditor';
import { QcmDisplay } from './qcm/QcmDisplay';
import { QcmEditor } from './qcm/QcmEditor';
import { FlashcardPlayer } from './player/FlashcardPlayer';
import { RankingPlayer } from './player/RankingPlayer';
import { OpentextPlayer } from './player/OpentextPlayer';
import { PostitPlayer } from './player/PostitPlayer';
import { QcmPlayer } from './player/QcmPlayer';
import { ComposedPlayer } from './player/ComposedPlayer';
import { ReadablePlayer } from './player/ReadablePlayer';
import { MediaPlayer } from './player/MediaPlayer';

/**
 * Creates a Player component that wraps a Display inside a ReadablePlayer.
 * ReadablePlayer tracks reading progress via viewport visibility.
 */
function withReadablePlayer(
  Display: ComponentType<WidgetDisplayProps>
): ComponentType<WidgetDisplayProps> {
  function WrappedReadablePlayer(props: WidgetDisplayProps) {
    return (
      <ReadablePlayer>
        <Display {...props} />
      </ReadablePlayer>
    );
  }
  WrappedReadablePlayer.displayName = `ReadablePlayer(${Display.displayName ?? Display.name ?? 'Component'})`;
  return WrappedReadablePlayer;
}

/**
 * Creates a Player component that wraps a Display inside a MediaPlayer.
 * MediaPlayer tracks audio/video playback progress.
 */
function withMediaPlayer(
  Display: ComponentType<WidgetDisplayProps>
): ComponentType<WidgetDisplayProps> {
  function WrappedMediaPlayer(props: WidgetDisplayProps) {
    return (
      <MediaPlayer>
        <Display {...props} />
      </MediaPlayer>
    );
  }
  WrappedMediaPlayer.displayName = `MediaPlayer(${Display.displayName ?? Display.name ?? 'Component'})`;
  return WrappedMediaPlayer;
}

export interface WidgetRenderers {
  Display: ComponentType<WidgetDisplayProps>;
  Editor: ComponentType<WidgetEditorProps>;
  Player?: ComponentType<WidgetDisplayProps>;
}

const registry: Partial<Record<WidgetType, WidgetRenderers>> = {
  QUIZ: { Display: QuizDisplay, Editor: QuizEditor, Player: QuizPlayer },
  WORDCLOUD: { Display: WordcloudDisplay, Editor: WordcloudEditor },
  ROLEPLAY: { Display: RoleplayDisplay, Editor: RoleplayEditor },
  MULTIPLE_CHOICE: { Display: MultipleChoiceDisplay, Editor: MultipleChoiceEditor, Player: QuizPlayer },
  POSTIT: { Display: PostitDisplay, Editor: PostitEditor, Player: PostitPlayer },
  RANKING: { Display: RankingDisplay, Editor: RankingEditor, Player: RankingPlayer },
  OPENTEXT: { Display: OpentextDisplay, Editor: OpentextEditor, Player: OpentextPlayer },
  PRESENTATION: { Display: GenericWidgetDisplay, Editor: GenericWidgetEditor, Player: ComposedPlayer },
  IMAGE: { Display: ImageDisplay, Editor: ImageEditor, Player: withReadablePlayer(ImageDisplay) },
  SEQUENCE: { Display: SequenceDisplay, Editor: SequenceEditor, Player: ComposedPlayer },
  COURSE_MODULE: { Display: CourseModuleDisplay, Editor: CourseModuleEditor, Player: ComposedPlayer },
  FAQ: { Display: FaqDisplay, Editor: FaqEditor, Player: withReadablePlayer(FaqDisplay) },
  GLOSSARY: { Display: GlossaryDisplay, Editor: GlossaryEditor, Player: withReadablePlayer(GlossaryDisplay) },
  SUMMARY: { Display: SummaryDisplay, Editor: SummaryEditor, Player: withReadablePlayer(SummaryDisplay) },
  FLASHCARD: { Display: FlashcardDisplay, Editor: FlashcardEditor, Player: FlashcardPlayer },
  TIMELINE: { Display: TimelineDisplay, Editor: TimelineEditor, Player: withReadablePlayer(TimelineDisplay) },
  REPORT: { Display: ReportDisplay, Editor: ReportEditor, Player: withReadablePlayer(ReportDisplay) },
  DATA_TABLE: { Display: DataTableDisplay, Editor: DataTableEditor, Player: withReadablePlayer(DataTableDisplay) },
  AUDIO: { Display: AudioDisplay, Editor: AudioEditor, Player: withMediaPlayer(AudioDisplay) },
  VIDEO: { Display: VideoDisplay, Editor: VideoEditor, Player: withMediaPlayer(VideoDisplay) },
  MINDMAP: { Display: MindmapDisplay, Editor: MindmapEditor, Player: withReadablePlayer(MindmapDisplay) },
  INFOGRAPHIC: { Display: InfographicDisplay, Editor: InfographicEditor, Player: withReadablePlayer(InfographicDisplay) },
  SYLLABUS: { Display: SyllabusDisplay, Editor: SyllabusEditor, Player: withReadablePlayer(SyllabusDisplay) },
  SESSION_PLAN: { Display: SessionPlanDisplay, Editor: SessionPlanEditor, Player: withReadablePlayer(SessionPlanDisplay) },
  PROGRAM_OVERVIEW: { Display: ProgramOverviewDisplay, Editor: ProgramOverviewEditor, Player: withReadablePlayer(ProgramOverviewDisplay) },
  CLASS_OVERVIEW: { Display: ClassOverviewDisplay, Editor: ClassOverviewEditor, Player: withReadablePlayer(ClassOverviewDisplay) },
  QCM: { Display: QcmDisplay, Editor: QcmEditor, Player: QcmPlayer },
};

export function registerWidget(
  type: WidgetType,
  renderers: WidgetRenderers
): void {
  registry[type] = renderers;
}

export function getWidgetRenderers(type: WidgetType): WidgetRenderers {
  return registry[type] ?? {
    Display: GenericWidgetDisplay,
    Editor: GenericWidgetEditor,
  };
}

export function hasCustomRenderers(type: WidgetType): boolean {
  return type in registry;
}
