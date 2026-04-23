'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { HelpCircle, Cloud, Users, Presentation, BookOpen, ListChecks, StickyNote, ArrowUpDown, FileText, Image as ImageIcon, Music, Video, Network, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizGenerationForm } from './QuizGenerationForm';
import { WordcloudGenerationForm } from './WordcloudGenerationForm';
import { PresentationGenerationForm } from './PresentationGenerationForm';
import { RoleplayGenerationForm } from './RoleplayGenerationForm';
import { CoursePlanGenerationForm } from './CoursePlanGenerationForm';
import { MultipleChoiceGenerationForm } from './MultipleChoiceGenerationForm';
import { PostitGenerationForm } from './PostitGenerationForm';
import { RankingGenerationForm } from './RankingGenerationForm';
import { OpentextGenerationForm } from './OpentextGenerationForm';
import { ImageGenerationForm } from './ImageGenerationForm';
import { AudioGenerationForm } from './AudioGenerationForm';
import { VideoGenerationForm } from './VideoGenerationForm';

export type GenerationType = 'QUIZ' | 'WORDCLOUD' | 'PRESENTATION' | 'ROLEPLAY' | 'COURSE_PLAN' | 'MULTIPLE_CHOICE' | 'POSTIT' | 'RANKING' | 'OPENTEXT' | 'IMAGE' | 'FAQ' | 'GLOSSARY' | 'SUMMARY' | 'FLASHCARD' | 'TIMELINE' | 'REPORT' | 'DATA_TABLE' | 'MINDMAP' | 'INFOGRAPHIC' | 'SYLLABUS' | 'SESSION_PLAN' | 'PROGRAM_OVERVIEW' | 'CLASS_OVERVIEW' | 'QCM' | 'AUDIO' | 'VIDEO';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: GenerationType;
  studioId: string;
  selectedSourceIds: Set<string>;
  onGenerated: () => void;
}

const typeConfigs: Record<GenerationType, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  QUIZ: {
    title: 'Generer un Quiz',
    icon: HelpCircle,
    color: 'text-blue-500',
  },
  WORDCLOUD: {
    title: 'Generer un Nuage de mots',
    icon: Cloud,
    color: 'text-purple-500',
  },
  PRESENTATION: {
    title: 'Generer une Presentation',
    icon: Presentation,
    color: 'text-orange-500',
  },
  ROLEPLAY: {
    title: 'Creer un Roleplay',
    icon: Users,
    color: 'text-green-500',
  },
  COURSE_PLAN: {
    title: 'Generer un Plan de cours',
    icon: BookOpen,
    color: 'text-teal-500',
  },
  MULTIPLE_CHOICE: {
    title: 'Generer un Choix multiple',
    icon: ListChecks,
    color: 'text-indigo-500',
  },
  POSTIT: {
    title: 'Generer un Post-it',
    icon: StickyNote,
    color: 'text-yellow-500',
  },
  RANKING: {
    title: 'Generer un Classement',
    icon: ArrowUpDown,
    color: 'text-rose-500',
  },
  OPENTEXT: {
    title: 'Generer un Texte libre',
    icon: FileText,
    color: 'text-emerald-500',
  },
  IMAGE: {
    title: "Generer une Image",
    icon: ImageIcon,
    color: 'text-pink-500',
  },
  FAQ: {
    title: 'Generer une FAQ',
    icon: HelpCircle,
    color: 'text-amber-500',
  },
  GLOSSARY: {
    title: 'Generer un Glossaire',
    icon: BookOpen,
    color: 'text-sky-500',
  },
  SUMMARY: {
    title: 'Generer un Resume',
    icon: FileText,
    color: 'text-slate-500',
  },
  FLASHCARD: {
    title: 'Generer des Flashcards',
    icon: BookOpen,
    color: 'text-lime-500',
  },
  TIMELINE: {
    title: 'Generer une Frise chronologique',
    icon: HelpCircle,
    color: 'text-fuchsia-500',
  },
  REPORT: {
    title: 'Generer un Rapport',
    icon: FileText,
    color: 'text-stone-500',
  },
  DATA_TABLE: {
    title: 'Generer un Tableau',
    icon: FileText,
    color: 'text-red-500',
  },
  MINDMAP: {
    title: 'Generer une Carte mentale',
    icon: Network,
    color: 'text-teal-500',
  },
  INFOGRAPHIC: {
    title: 'Generer une Infographie',
    icon: BarChart3,
    color: 'text-indigo-400',
  },
  SYLLABUS: {
    title: 'Creer un Syllabus',
    icon: BookOpen,
    color: 'text-violet-500',
  },
  SESSION_PLAN: {
    title: 'Creer un Plan de seance',
    icon: BookOpen,
    color: 'text-cyan-500',
  },
  PROGRAM_OVERVIEW: {
    title: 'Creer un Programme',
    icon: BookOpen,
    color: 'text-emerald-500',
  },
  CLASS_OVERVIEW: {
    title: 'Creer une Vue de classe',
    icon: BookOpen,
    color: 'text-amber-500',
  },
  QCM: {
    title: 'Generer un QCM',
    icon: ListChecks,
    color: 'text-indigo-600',
  },
  AUDIO: {
    title: 'Generer un Audio',
    icon: Music,
    color: 'text-orange-400',
  },
  VIDEO: {
    title: 'Generer une Video',
    icon: Video,
    color: 'text-red-400',
  },
};

export function GenerationModal({
  isOpen,
  onClose,
  type,
  studioId,
  selectedSourceIds,
  onGenerated,
}: GenerationModalProps) {
  const config = typeConfigs[type];
  const Icon = config.icon;

  const renderForm = () => {
    const commonProps = {
      studioId,
      selectedSourceIds,
      onClose,
      onGenerated,
    };

    switch (type) {
      case 'QUIZ':
        return <QuizGenerationForm {...commonProps} />;
      case 'WORDCLOUD':
        return <WordcloudGenerationForm {...commonProps} />;
      case 'PRESENTATION':
        return <PresentationGenerationForm {...commonProps} />;
      case 'ROLEPLAY':
        return <RoleplayGenerationForm {...commonProps} />;
      case 'COURSE_PLAN':
        return <CoursePlanGenerationForm {...commonProps} />;
      case 'MULTIPLE_CHOICE':
        return <MultipleChoiceGenerationForm {...commonProps} />;
      case 'POSTIT':
        return <PostitGenerationForm {...commonProps} />;
      case 'RANKING':
        return <RankingGenerationForm {...commonProps} />;
      case 'OPENTEXT':
        return <OpentextGenerationForm {...commonProps} />;
      case 'IMAGE':
        return <ImageGenerationForm {...commonProps} />;
      case 'AUDIO':
        return <AudioGenerationForm {...commonProps} />;
      case 'VIDEO':
        return <VideoGenerationForm {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', config.color)} />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        {/* Selected sources indicator */}
        <div className="text-sm text-muted-foreground mb-4">
          {selectedSourceIds.size} source(s) selectionnee(s)
        </div>

        {renderForm()}
      </DialogContent>
    </Dialog>
  );
}
