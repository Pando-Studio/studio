'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  HelpCircle,
  Cloud,
  Users,
  Presentation,
  BookOpen,
  ListChecks,
  StickyNote,
  ArrowUpDown,
  FileText,
  ListOrdered,
  GraduationCap,
  Image as ImageIcon,
  Sparkles,
  Music,
  Video,
  Network,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenerationProgress } from '@/hooks/use-generation-progress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerationProgressCardProps {
  run: {
    id: string;
    type: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    errorLog?: string;
    metadata?: {
      progress?: number;
      step?: string;
      label?: string;
      [key: string]: unknown;
    };
    widgetId?: string;
    createdAt: string;
  };
  studioId: string;
  onViewWidget?: () => void;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const typeConfigs: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bgColor: string }
> = {
  QUIZ: { icon: HelpCircle, label: 'Quiz', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  WORDCLOUD: { icon: Cloud, label: 'Nuage de mots', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  ROLEPLAY: { icon: Users, label: 'Roleplay', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  PRESENTATION: { icon: Presentation, label: 'Presentation', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  COURSE_PLAN: { icon: BookOpen, label: 'Plan de cours', color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  MULTIPLE_CHOICE: { icon: ListChecks, label: 'Choix Multiple', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  POSTIT: { icon: StickyNote, label: 'Post-it', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  RANKING: { icon: ArrowUpDown, label: 'Classement', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  OPENTEXT: { icon: FileText, label: 'Texte libre', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  SEQUENCE: { icon: ListOrdered, label: 'Sequence', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  COURSE_MODULE: { icon: GraduationCap, label: 'Module de cours', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  IMAGE: { icon: ImageIcon, label: 'Image', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  FAQ: { icon: HelpCircle, label: 'FAQ', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  GLOSSARY: { icon: BookOpen, label: 'Glossaire', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  SUMMARY: { icon: FileText, label: 'Resume', color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  FLASHCARD: { icon: BookOpen, label: 'Flashcard', color: 'text-lime-500', bgColor: 'bg-lime-500/10' },
  TIMELINE: { icon: Clock, label: 'Frise chronologique', color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-500/10' },
  REPORT: { icon: FileText, label: 'Rapport', color: 'text-stone-500', bgColor: 'bg-stone-500/10' },
  DATA_TABLE: { icon: FileText, label: 'Tableau de donnees', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  AUDIO: { icon: Music, label: 'Audio', color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
  VIDEO: { icon: Video, label: 'Video', color: 'text-red-400', bgColor: 'bg-red-400/10' },
  MINDMAP: { icon: Network, label: 'Carte mentale', color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  INFOGRAPHIC: { icon: BarChart3, label: 'Infographie', color: 'text-indigo-400', bgColor: 'bg-indigo-400/10' },
  SYLLABUS: { icon: BookOpen, label: 'Syllabus', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  SESSION_PLAN: { icon: Clock, label: 'Seance', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  PROGRAM_OVERVIEW: { icon: GraduationCap, label: 'Programme', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  CLASS_OVERVIEW: { icon: BookOpen, label: 'Classe', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  QCM: { icon: ListChecks, label: 'QCM', color: 'text-indigo-600', bgColor: 'bg-indigo-600/10' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useElapsedTime(startIso: string) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    function update() {
      const diffMs = Date.now() - new Date(startIso).getTime();
      const seconds = Math.floor(diffMs / 1000);
      if (seconds < 60) {
        setElapsed(`il y a ${seconds}s`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setElapsed(`il y a ${minutes}min`);
      }
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startIso]);

  return elapsed;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
}

function IndeterminateProgressBar() {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GenerationProgressCard({
  run: initialRun,
  studioId,
  onViewWidget,
}: GenerationProgressCardProps) {
  const isActive = initialRun.status === 'PENDING' || initialRun.status === 'RUNNING';

  // Poll for detailed progress when active
  const { data: detailedRun } = useGenerationProgress(studioId, initialRun.id, isActive);

  // Merge initial run data with polled detail (polled takes precedence when available)
  const run = detailedRun ?? initialRun;

  const config = typeConfigs[run.type] ?? {
    icon: Sparkles,
    label: run.type,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  };
  const TypeIcon = config.icon;

  const elapsed = useElapsedTime(run.createdAt);
  const progress = (run.metadata?.progress as number | undefined) ?? 0;
  const stepLabel = run.metadata?.label as string | undefined;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        run.status === 'RUNNING' && 'border-primary/30 bg-primary/5',
        run.status === 'PENDING' && 'border-muted bg-muted/30',
        run.status === 'COMPLETED' && 'border-green-500/30 bg-green-500/5',
        run.status === 'FAILED' && 'border-red-500/30 bg-red-500/5',
      )}
    >
      {/* Header row: icon + title + elapsed time */}
      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded-md', config.bgColor)}>
          {run.status === 'RUNNING' ? (
            <Loader2 className={cn('h-4 w-4 animate-spin', config.color)} />
          ) : run.status === 'COMPLETED' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : run.status === 'FAILED' ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <TypeIcon className={cn('h-4 w-4', config.color)} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{config.label}</p>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="h-3 w-3" />
          <span>{elapsed}</span>
        </div>
      </div>

      {/* Status-specific content */}
      {run.status === 'PENDING' && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground animate-pulse">En attente...</p>
          <IndeterminateProgressBar />
        </div>
      )}

      {run.status === 'RUNNING' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {stepLabel || 'Generation en cours...'}
            </p>
            {progress > 0 && (
              <span className="text-xs font-medium text-primary">{progress}%</span>
            )}
          </div>
          {progress > 0 ? (
            <ProgressBar progress={progress} />
          ) : (
            <IndeterminateProgressBar />
          )}
        </div>
      )}

      {run.status === 'COMPLETED' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-green-600">Generation terminee</p>
          {onViewWidget && (
            <button
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={onViewWidget}
            >
              <Eye className="h-3 w-3" />
              Voir le widget
            </button>
          )}
        </div>
      )}

      {run.status === 'FAILED' && (
        <div className="space-y-1">
          <p className="text-xs text-red-600">Echec de la generation</p>
          {run.errorLog && (
            <p className="text-xs text-red-500/80 truncate" title={run.errorLog}>
              {run.errorLog.length > 80
                ? `${run.errorLog.slice(0, 80)}...`
                : run.errorLog}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
