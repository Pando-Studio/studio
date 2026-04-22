'use client';

import { useState, useMemo } from 'react';
import { Button, Input } from '@/components/ui';
import { useStudio, usePanels } from '../context/StudioContext';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Library,
  Settings,
  HelpCircle,
  Cloud,
  Users,
  ChevronDown,
  ChevronUp,
  Presentation,
  BookOpen,
  ListChecks,
  StickyNote,
  ArrowUpDown,
  FileText,
  ListOrdered,
  GraduationCap,
  Star,
  FileInput,
  Image as ImageIcon,
  Search,
  Clock,
  ArrowDownAZ,
  Music,
  Video,
  Network,
  BarChart3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GenerationModal, type GenerationType } from '@/components/studio/modals/GenerationModal';
import { CoursePlanEditorModal } from '@/components/studio/modals/CoursePlanEditorModal';
import { WidgetDetailModal } from '@/components/widgets/WidgetDetailModal';
import { CreateCompositeFromLibraryModal } from '@/components/studio/modals/CreateCompositeFromLibraryModal';
import { GenerationProgressCard } from '@/components/studio/GenerationProgressCard';

// Widget type configs
const widgetTypeConfigs: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  QUIZ: { icon: HelpCircle, label: 'Quiz', color: 'text-blue-500 bg-blue-500/10' },
  WORDCLOUD: { icon: Cloud, label: 'Nuage de mots', color: 'text-purple-500 bg-purple-500/10' },
  ROLEPLAY: { icon: Users, label: 'Roleplay', color: 'text-green-500 bg-green-500/10' },
  PRESENTATION: { icon: Presentation, label: 'Presentation', color: 'text-orange-500 bg-orange-500/10' },
  COURSE_PLAN: { icon: BookOpen, label: 'Plan de cours', color: 'text-teal-500 bg-teal-500/10' },
  MULTIPLE_CHOICE: { icon: ListChecks, label: 'Choix Multiple', color: 'text-indigo-500 bg-indigo-500/10' },
  POSTIT: { icon: StickyNote, label: 'Post-it', color: 'text-yellow-500 bg-yellow-500/10' },
  RANKING: { icon: ArrowUpDown, label: 'Classement', color: 'text-rose-500 bg-rose-500/10' },
  OPENTEXT: { icon: FileText, label: 'Texte libre', color: 'text-emerald-500 bg-emerald-500/10' },
  SEQUENCE: { icon: ListOrdered, label: 'Sequence', color: 'text-cyan-500 bg-cyan-500/10' },
  COURSE_MODULE: { icon: GraduationCap, label: 'Module de cours', color: 'text-violet-500 bg-violet-500/10' },
  IMAGE: { icon: ImageIcon, label: 'Image', color: 'text-pink-500 bg-pink-500/10' },
  FAQ: { icon: HelpCircle, label: 'FAQ', color: 'text-amber-500 bg-amber-500/10' },
  GLOSSARY: { icon: BookOpen, label: 'Glossaire', color: 'text-sky-500 bg-sky-500/10' },
  SUMMARY: { icon: FileText, label: 'Resume', color: 'text-slate-500 bg-slate-500/10' },
  FLASHCARD: { icon: Library, label: 'Flashcard', color: 'text-lime-500 bg-lime-500/10' },
  TIMELINE: { icon: Clock, label: 'Frise chronologique', color: 'text-fuchsia-500 bg-fuchsia-500/10' },
  REPORT: { icon: FileInput, label: 'Rapport', color: 'text-stone-500 bg-stone-500/10' },
  DATA_TABLE: { icon: ArrowDownAZ, label: 'Tableau de donnees', color: 'text-red-500 bg-red-500/10' },
  AUDIO: { icon: Music, label: 'Audio', color: 'text-orange-400 bg-orange-400/10' },
  VIDEO: { icon: Video, label: 'Video', color: 'text-red-400 bg-red-400/10' },
  MINDMAP: { icon: Network, label: 'Carte mentale', color: 'text-teal-500 bg-teal-500/10' },
  INFOGRAPHIC: { icon: BarChart3, label: 'Infographie', color: 'text-indigo-400 bg-indigo-400/10' },
  SYLLABUS: { icon: BookOpen, label: 'Syllabus', color: 'text-violet-500 bg-violet-500/10' },
  SESSION_PLAN: { icon: Clock, label: 'Seance', color: 'text-cyan-500 bg-cyan-500/10' },
  PROGRAM_OVERVIEW: { icon: GraduationCap, label: 'Programme', color: 'text-emerald-500 bg-emerald-500/10' },
  CLASS_OVERVIEW: { icon: BookOpen, label: 'Classe', color: 'text-amber-500 bg-amber-500/10' },
  QCM: { icon: ListChecks, label: 'QCM', color: 'text-indigo-600 bg-indigo-600/10' },
};

// Run type labels for better display
const runTypeLabels: Record<string, string> = {
  COURSE_PLAN: 'Plan de cours',
  QUIZ: 'Quiz',
  WORDCLOUD: 'Nuage de mots',
  ROLEPLAY: 'Roleplay',
  PRESENTATION: 'Presentation',
  MULTIPLE_CHOICE: 'Choix Multiple',
  POSTIT: 'Post-it',
  RANKING: 'Classement',
  OPENTEXT: 'Texte libre',
  SEQUENCE: 'Sequence',
  COURSE_MODULE: 'Module de cours',
  IMAGE: 'Image',
  FAQ: 'FAQ',
  GLOSSARY: 'Glossaire',
  SUMMARY: 'Resume',
  FLASHCARD: 'Flashcard',
  TIMELINE: 'Frise chronologique',
  REPORT: 'Rapport',
  DATA_TABLE: 'Tableau de donnees',
  AUDIO: 'Audio',
  VIDEO: 'Video',
  MINDMAP: 'Carte mentale',
  INFOGRAPHIC: 'Infographie',
  SYLLABUS: 'Syllabus',
  SESSION_PLAN: 'Seance',
  PROGRAM_OVERVIEW: 'Programme',
  CLASS_OVERVIEW: 'Classe',
  QCM: 'QCM',
};

// Widget tags (multi-category)
type WidgetTag = 'basic' | 'evaluation' | 'interactif' | 'contenu' | 'media' | 'lycee' | 'superieur';

const tagLabels: Record<WidgetTag | 'all', string> = {
  all: 'Tous',
  basic: 'Basic',
  evaluation: 'Evaluation',
  interactif: 'Interactif',
  contenu: 'Contenu',
  media: 'Media',
  lycee: 'Lycee',
  superieur: 'Superieur',
};

// Generables templates
const generableTemplates: Array<{
  type: GenerationType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  tags: WidgetTag[];
}> = [
  { type: 'QUIZ', title: 'Quiz', description: 'Quiz a choix multiples', icon: HelpCircle, color: 'text-blue-500', bgColor: 'bg-blue-500/10', tags: ['evaluation', 'interactif'] },
  { type: 'QCM', title: 'QCM', description: 'Ensemble de questions a choix multiple', icon: ListChecks, color: 'text-indigo-600', bgColor: 'bg-indigo-600/10', tags: ['evaluation', 'interactif'] },
  { type: 'MULTIPLE_CHOICE', title: 'Choix Multiple', description: 'Question avec correction', icon: ListChecks, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', tags: ['evaluation', 'interactif'] },
  { type: 'FLASHCARD', title: 'Flashcards', description: 'Fiches de revision recto-verso', icon: Library, color: 'text-lime-500', bgColor: 'bg-lime-500/10', tags: ['evaluation', 'basic'] },
  { type: 'RANKING', title: 'Classement', description: 'Classez des elements par priorite', icon: ArrowUpDown, color: 'text-rose-500', bgColor: 'bg-rose-500/10', tags: ['interactif', 'evaluation'] },
  { type: 'ROLEPLAY', title: 'Roleplay', description: 'Simulez des situations', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10', tags: ['interactif'] },
  { type: 'POSTIT', title: 'Post-it', description: 'Session de brainstorming', icon: StickyNote, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', tags: ['interactif'] },
  { type: 'FAQ', title: 'FAQ', description: 'Questions-reponses frequentes', icon: HelpCircle, color: 'text-amber-500', bgColor: 'bg-amber-500/10', tags: ['basic', 'contenu'] },
  { type: 'GLOSSARY', title: 'Glossaire', description: 'Termes et definitions cles', icon: BookOpen, color: 'text-sky-500', bgColor: 'bg-sky-500/10', tags: ['basic', 'contenu'] },
  { type: 'SUMMARY', title: 'Resume', description: 'Synthese structuree des sources', icon: FileText, color: 'text-slate-500', bgColor: 'bg-slate-500/10', tags: ['basic', 'contenu'] },
  { type: 'TIMELINE', title: 'Frise chronologique', description: 'Evenements ordonnes dans le temps', icon: Clock, color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-500/10', tags: ['basic', 'contenu'] },
  { type: 'REPORT', title: 'Rapport', description: 'Document structure complet', icon: FileInput, color: 'text-stone-500', bgColor: 'bg-stone-500/10', tags: ['basic', 'contenu'] },
  { type: 'DATA_TABLE', title: 'Tableau de donnees', description: 'Extraction de donnees structurees', icon: ArrowDownAZ, color: 'text-red-500', bgColor: 'bg-red-500/10', tags: ['basic', 'contenu'] },
  { type: 'MINDMAP', title: 'Carte mentale', description: 'Concepts hierarchises visuellement', icon: Network, color: 'text-teal-500', bgColor: 'bg-teal-500/10', tags: ['basic', 'contenu'] },
  { type: 'INFOGRAPHIC', title: 'Infographie', description: 'Chiffres cles et donnees visuelles', icon: BarChart3, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', tags: ['basic', 'contenu'] },
  { type: 'IMAGE', title: 'Image', description: "Generez une image avec l'IA", icon: ImageIcon, color: 'text-pink-500', bgColor: 'bg-pink-500/10', tags: ['contenu', 'media'] },
  { type: 'AUDIO', title: 'Audio', description: 'Podcast audio des sources', icon: Music, color: 'text-orange-400', bgColor: 'bg-orange-400/10', tags: ['media'] },
  { type: 'VIDEO', title: 'Video', description: 'Resume video des sources', icon: Video, color: 'text-red-400', bgColor: 'bg-red-400/10', tags: ['media'] },
  { type: 'PRESENTATION', title: 'Presentation', description: 'Presentation en slides', icon: Presentation, color: 'text-orange-500', bgColor: 'bg-orange-500/10', tags: ['contenu'] },
  { type: 'COURSE_PLAN', title: 'Plan de cours', description: 'Plan de formation structure', icon: BookOpen, color: 'text-teal-500', bgColor: 'bg-teal-500/10', tags: ['contenu'] },
  { type: 'SYLLABUS', title: 'Syllabus', description: 'Programme avec objectifs et plan', icon: BookOpen, color: 'text-violet-500', bgColor: 'bg-violet-500/10', tags: ['superieur'] },
  { type: 'SESSION_PLAN', title: 'Plan de seance', description: 'Deroulement d\'une seance', icon: Clock, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', tags: ['superieur', 'lycee'] },
  { type: 'PROGRAM_OVERVIEW', title: 'Programme', description: 'Vue d\'ensemble (superieur)', icon: GraduationCap, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', tags: ['superieur'] },
  { type: 'CLASS_OVERVIEW', title: 'Classe', description: 'Vue d\'ensemble (secondaire)', icon: BookOpen, color: 'text-amber-500', bgColor: 'bg-amber-500/10', tags: ['lycee'] },
];

// Quick generate config: maps each type to template + default inputs
const quickGenerateConfig: Record<GenerationType, {
  templateId?: string;
  legacyEndpoint?: string;
  defaultInputs: Record<string, unknown>;
  defaultTitle: string;
  requiresModal: boolean;
}> = {
  QUIZ: { templateId: 'qiplim/quiz-interactive', defaultInputs: { questionCount: 5, difficulty: 'medium', optionsPerQuestion: 4 }, defaultTitle: 'Quiz', requiresModal: false },
  MULTIPLE_CHOICE: { templateId: 'qiplim/multiple-choice-interactive', defaultInputs: { questionCount: 5, optionsPerQuestion: 4 }, defaultTitle: 'Choix Multiple', requiresModal: false },
  WORDCLOUD: { templateId: 'qiplim/wordcloud-interactive', defaultInputs: {}, defaultTitle: 'Nuage de mots', requiresModal: false },
  ROLEPLAY: { templateId: 'qiplim/roleplay-conversation', defaultInputs: {}, defaultTitle: 'Roleplay', requiresModal: false },
  POSTIT: { templateId: 'qiplim/postit-brainstorm', defaultInputs: {}, defaultTitle: 'Post-it', requiresModal: false },
  RANKING: { templateId: 'qiplim/ranking-prioritization', defaultInputs: {}, defaultTitle: 'Classement', requiresModal: false },
  OPENTEXT: { templateId: 'qiplim/opentext-reflection', defaultInputs: {}, defaultTitle: 'Texte libre', requiresModal: false },
  PRESENTATION: { legacyEndpoint: '/api/studios/{studioId}/generate/presentation', defaultInputs: { language: 'fr' }, defaultTitle: 'Presentation', requiresModal: false },
  COURSE_PLAN: { legacyEndpoint: '/api/studios/{studioId}/generate/course-plan', defaultInputs: { language: 'fr' }, defaultTitle: 'Plan de cours', requiresModal: false },
  IMAGE: { templateId: 'qiplim/image-generation', defaultInputs: {}, defaultTitle: 'Image', requiresModal: true },
  FAQ: { templateId: 'qiplim/faq-extraction', defaultInputs: { questionCount: 8 }, defaultTitle: 'FAQ', requiresModal: false },
  GLOSSARY: { templateId: 'qiplim/glossary-extraction', defaultInputs: { termCount: 15 }, defaultTitle: 'Glossaire', requiresModal: false },
  SUMMARY: { templateId: 'qiplim/summary-structured', defaultInputs: {}, defaultTitle: 'Resume', requiresModal: false },
  FLASHCARD: { templateId: 'qiplim/flashcard-learning', defaultInputs: { cardCount: 'standard', difficulty: 'moyen' }, defaultTitle: 'Flashcards', requiresModal: false },
  TIMELINE: { templateId: 'qiplim/timeline-chronological', defaultInputs: { eventCount: 8 }, defaultTitle: 'Frise chronologique', requiresModal: false },
  REPORT: { templateId: 'qiplim/report-document', defaultInputs: { format: 'synthesis' }, defaultTitle: 'Rapport', requiresModal: false },
  DATA_TABLE: { templateId: 'qiplim/data-table-extraction', defaultInputs: {}, defaultTitle: 'Tableau de donnees', requiresModal: false },
  MINDMAP: { templateId: 'qiplim/mindmap-extraction', defaultInputs: { maxDepth: 3 }, defaultTitle: 'Carte mentale', requiresModal: false },
  INFOGRAPHIC: { templateId: 'qiplim/infographic-visual', defaultInputs: { style: 'overview' }, defaultTitle: 'Infographie', requiresModal: false },
  SYLLABUS: { templateId: 'qiplim/syllabus-generation', defaultInputs: { locale: 'generic' }, defaultTitle: 'Syllabus', requiresModal: false },
  SESSION_PLAN: { templateId: 'qiplim/session-plan-generation', defaultInputs: { duration: '1h30' }, defaultTitle: 'Plan de seance', requiresModal: false },
  PROGRAM_OVERVIEW: { templateId: 'qiplim/program-overview-generation', defaultInputs: {}, defaultTitle: 'Programme', requiresModal: false },
  CLASS_OVERVIEW: { templateId: 'qiplim/class-overview-generation', defaultInputs: {}, defaultTitle: 'Classe', requiresModal: false },
  QCM: { templateId: 'qiplim/qcm-evaluation', defaultInputs: { questionCount: 10, optionsPerQuestion: 4 }, defaultTitle: 'QCM', requiresModal: false },
  AUDIO: { templateId: 'qiplim/audio-podcast', defaultInputs: { targetDuration: '3', tone: 'casual', style: 'discussion', speakerCount: '2' }, defaultTitle: 'Audio', requiresModal: false },
  VIDEO: { templateId: 'qiplim/video-slideshow', defaultInputs: { slideCount: 8, targetDuration: '3', tone: 'professional' }, defaultTitle: 'Video', requiresModal: false },
};

// Section components
function GenerablesSection({
  onQuickGenerate,
  onOpenGenerationModal,
}: {
  onQuickGenerate: (type: GenerationType) => void;
  onOpenGenerationModal: (type: GenerationType) => void;
}) {
  const { selectedSourceIds } = useStudio();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<WidgetTag | 'all'>('all');

  const filteredTemplates = generableTemplates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === 'all' || t.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-2">
      {/* Search */}
      <input
        type="text"
        placeholder="Rechercher..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Tag filters */}
      <div className="flex gap-1 flex-wrap">
        {(Object.keys(tagLabels) as (WidgetTag | 'all')[]).map((tag) => (
          <button
            key={tag}
            className={cn(
              'px-2 py-0.5 text-xs rounded-full transition-colors',
              activeTag === tag
                ? 'bg-primary text-primary-foreground'
                : 'bg-white border border-gray-200 text-muted-foreground hover:bg-yellow-50'
            )}
            onClick={() => setActiveTag(tag)}
          >
            {tagLabels[tag]}
          </button>
        ))}
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredTemplates.map((template) => (
          <div
            key={template.type}
            className="relative group"
          >
            <button
              className="w-full flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 bg-white hover:border-primary hover:bg-yellow-50/50 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedSourceIds.size === 0}
              onClick={() => onQuickGenerate(template.type)}
            >
              <div className={cn('p-1.5 rounded-lg', template.bgColor)}>
                <template.icon className={cn('h-4 w-4', template.color)} />
              </div>
              <span className="text-xs font-medium leading-tight">{template.title}</span>
            </button>
            {/* Settings button on hover */}
            <button
              className="absolute top-1 right-1 p-1 rounded-md bg-white/80 border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 disabled:opacity-0"
              disabled={selectedSourceIds.size === 0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenGenerationModal(template.type);
              }}
              title="Personnaliser"
            >
              <Settings className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucun generable trouve
        </p>
      )}
      {selectedSourceIds.size === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Selectionnez des sources pour generer du contenu
        </p>
      )}
    </div>
  );
}

// Relative time formatting
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Status badge config
const statusConfig: Record<string, { dot: string; label: string }> = {
  DRAFT: { dot: 'bg-gray-400', label: 'Brouillon' },
  GENERATING: { dot: 'bg-blue-500 animate-pulse', label: 'Generation...' },
  READY: { dot: 'bg-green-500', label: 'Pret' },
  ERROR: { dot: 'bg-red-500', label: 'Erreur' },
};

type LibrarySortMode = 'newest' | 'type';

function LibrarySection({
  onOpenCoursePlan,
  onOpenWidget,
  onCreateComposite,
  onCreateCompositeFromLibrary,
  onConvertToSource,
  studioId,
}: {
  onOpenCoursePlan: (id: string) => void;
  onOpenWidget: (id: string) => void;
  onCreateComposite?: (type: 'SEQUENCE' | 'COURSE_MODULE') => void;
  onCreateCompositeFromLibrary?: () => void;
  onConvertToSource?: (widgetId?: string, coursePlanId?: string) => void;
  studioId: string;
}) {
  const { rootWidgets, coursePlans, isFavorite, toggleFavorite, favorites, runs } = useStudio();
  const widgets = rootWidgets;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<LibrarySortMode>('newest');
  const [showAll, setShowAll] = useState(false);

  const totalItems = widgets.length + coursePlans.length;

  // Collect unique widget types present in the list
  const presentTypes = useMemo(() => {
    const types = new Set<string>();
    for (const w of widgets) types.add(w.type);
    for (const _cp of coursePlans) types.add('COURSE_PLAN');
    return Array.from(types).filter((t) => widgetTypeConfigs[t]);
  }, [widgets, coursePlans]);

  // Unified items for filtering/sorting
  type LibraryItem =
    | { kind: 'widget'; id: string; title: string; type: string; status: string; createdAt: string; widget: typeof widgets[number] }
    | { kind: 'coursePlan'; id: string; title: string; type: string; status: string; createdAt: string; coursePlan: typeof coursePlans[number] };

  // Widget IDs that have an active generation run (shown as progress cards above)
  const activeRunWidgetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of runs) {
      if ((r.status === 'PENDING' || r.status === 'RUNNING') && r.widgetId) {
        ids.add(r.widgetId);
      }
    }
    return ids;
  }, [runs]);

  const allItems = useMemo<LibraryItem[]>(() => {
    const items: LibraryItem[] = [];
    for (const w of widgets) {
      // Skip widgets already shown as active generation progress cards
      if (activeRunWidgetIds.has(w.id)) continue;
      items.push({ kind: 'widget', id: w.id, title: w.title, type: w.type, status: w.status, createdAt: w.createdAt, widget: w });
    }
    for (const cp of coursePlans) {
      items.push({ kind: 'coursePlan', id: cp.id, title: cp.title, type: 'COURSE_PLAN', status: cp.status, createdAt: cp.createdAt, coursePlan: cp });
    }
    return items;
  }, [widgets, coursePlans, activeRunWidgetIds]);

  const filteredAndSorted = useMemo(() => {
    let result = allItems;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q));
    }

    // Type filter
    if (selectedType) {
      result = result.filter((item) => item.type === selectedType);
    }

    // Sort
    if (sortBy === 'newest') {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result = [...result].sort((a, b) => a.type.localeCompare(b.type) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [allItems, searchQuery, selectedType, sortBy]);

  const visibleItems = showAll ? filteredAndSorted : filteredAndSorted.slice(0, 8);
  const hasMore = filteredAndSorted.length > 8;

  // Favorites from other studios
  const crossStudioFavorites = favorites.filter((f) => {
    if (f.widgetId) return !widgets.some((w) => w.id === f.widgetId);
    if (f.coursePlanId) return !coursePlans.some((cp) => cp.id === f.coursePlanId);
    return false;
  });

  return (
    <div className="space-y-2">
      {/* Cross-studio favorites */}
      {crossStudioFavorites.length > 0 && (
        <div className="space-y-1 pb-2 border-b">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            Favoris
          </p>
          {crossStudioFavorites.slice(0, 3).map((fav) => {
            const item = fav.widget || fav.coursePlan;
            if (!item) return null;
            const isWidget = !!fav.widget;
            const config = isWidget
              ? widgetTypeConfigs[fav.widget!.type]
              : widgetTypeConfigs['COURSE_PLAN'];
            if (!config) return null;
            const FavIcon = config.icon;

            return (
              <div
                key={fav.id}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-background transition-colors cursor-pointer text-xs"
                onClick={() =>
                  isWidget ? onOpenWidget(fav.widgetId!) : onOpenCoursePlan(fav.coursePlanId!)
                }
              >
                <div className={cn('p-1 rounded', config.color.split(' ')[1])}>
                  <FavIcon className={cn('h-3 w-3', config.color.split(' ')[0])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {(item as { studio?: { title: string } }).studio?.title}
                  </p>
                </div>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Active generation runs — only in-progress (PENDING/RUNNING) */}
      {runs
        .filter((r) => r.status === 'PENDING' || r.status === 'RUNNING')
        .map((run) => (
          <GenerationProgressCard
            key={run.id}
            run={run}
            studioId={studioId}
          />
        ))}

      {/* Empty state */}
      {totalItems === 0 && runs.filter((r) => r.status === 'PENDING' || r.status === 'RUNNING').length === 0 && crossStudioFavorites.length === 0 && (
        <div className="text-center py-4">
          <Library className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucun contenu genere
          </p>
        </div>
      )}

      {/* Search, filters, sort — only when there are items */}
      {totalItems > 0 && (
        <>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>

          {/* Type filter chips + sort toggle */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
              {presentTypes.map((type) => {
                const config = widgetTypeConfigs[type];
                if (!config) return null;
                const TypeIcon = config.icon;
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full whitespace-nowrap transition-colors flex-shrink-0',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white border border-gray-200 text-muted-foreground hover:bg-yellow-50'
                    )}
                    onClick={() => setSelectedType(isActive ? null : type)}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {config.label}
                  </button>
                );
              })}
            </div>
            <button
              className={cn(
                'flex-shrink-0 p-1 rounded-md transition-colors',
                'hover:bg-muted text-muted-foreground'
              )}
              onClick={() => setSortBy(sortBy === 'newest' ? 'type' : 'newest')}
              title={sortBy === 'newest' ? 'Tri: plus recent' : 'Tri: par type'}
            >
              {sortBy === 'newest' ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownAZ className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </>
      )}

      {/* Items list */}
      {visibleItems.map((item) => {
        const config = widgetTypeConfigs[item.type];
        if (!config) return null;
        const TypeIcon = config.icon;
        const status = statusConfig[item.status];

        if (item.kind === 'coursePlan') {
          const coursePlan = item.coursePlan;
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:border-primary transition-colors cursor-pointer group"
              onClick={() => onOpenCoursePlan(coursePlan.id)}
            >
              <div className={cn('p-1.5 rounded', config.color.split(' ')[1])}>
                <TypeIcon className={cn('h-4 w-4', config.color.split(' ')[0])} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{coursePlan.title}</p>
                  {status && (
                    <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', status.dot)} title={status.label} />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {config.label} · {formatRelativeTime(coursePlan.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {coursePlan.status === 'READY' && onConvertToSource && (
                  <button
                    className="p-1 hover:bg-muted rounded"
                    title="Utiliser comme source"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConvertToSource(undefined, coursePlan.id);
                    }}
                  >
                    <FileInput className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  className="p-1 hover:bg-muted rounded"
                  title="Favori"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(undefined, coursePlan.id);
                  }}
                >
                  <Star
                    className={cn(
                      'h-3.5 w-3.5',
                      isFavorite(undefined, coursePlan.id)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              </div>
            </div>
          );
        }

        // Widget item
        const widget = item.widget;
        return (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:border-primary transition-colors cursor-pointer group"
            onClick={() => onOpenWidget(widget.id)}
          >
            <div className={cn('p-1.5 rounded', config.color.split(' ')[1])}>
              <TypeIcon className={cn('h-4 w-4', config.color.split(' ')[0])} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{widget.title}</p>
                {status && (
                  <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', status.dot)} title={status.label} />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {config.label} · {formatRelativeTime(widget.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {widget.status === 'READY' && widget.kind === 'LEAF' && onConvertToSource && (
                <button
                  className="p-1 hover:bg-muted rounded"
                  title="Utiliser comme source"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConvertToSource(widget.id);
                  }}
                >
                  <FileInput className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button
                className="p-1 hover:bg-muted rounded"
                title="Favori"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(widget.id);
                }}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    isFavorite(widget.id)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
            </div>
          </div>
        );
      })}

      {/* No results after filtering */}
      {totalItems > 0 && filteredAndSorted.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucun resultat
        </p>
      )}

      {/* Show more / Show less toggle */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Reduire
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Voir tout ({filteredAndSorted.length})
            </>
          )}
        </Button>
      )}

      {/* Create composite */}
      {(onCreateComposite || onCreateCompositeFromLibrary) && (
        <div className="pt-2 border-t space-y-1">
          <p className="text-xs text-muted-foreground mb-1">Creer un composite</p>
          <div className="flex flex-col gap-1">
            {onCreateComposite && (
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white text-xs hover:bg-yellow-50 hover:border-primary transition-colors"
                  onClick={() => onCreateComposite('SEQUENCE')}
                >
                  <ListOrdered className="h-3.5 w-3.5 text-cyan-500" />
                  Sequence
                </button>
                <button
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white text-xs hover:bg-yellow-50 hover:border-primary transition-colors"
                  onClick={() => onCreateComposite('COURSE_MODULE')}
                >
                  <GraduationCap className="h-3.5 w-3.5 text-violet-500" />
                  Module
                </button>
              </div>
            )}
            {onCreateCompositeFromLibrary && widgets.filter((w) => w.status === 'READY' && w.kind === 'LEAF').length >= 2 && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white text-xs hover:bg-yellow-50 hover:border-primary transition-colors"
                onClick={onCreateCompositeFromLibrary}
              >
                <Library className="h-3.5 w-3.5 text-muted-foreground" />
                Depuis la bibliotheque
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { studio, runs, selectedSourceIds, refreshStudio, rootWidgets } = useStudio();
  const { isRightPanelCollapsed, toggleRightPanel } = usePanels();
  const router = useRouter();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['generables', 'library'])
  );
  const [generationModalType, setGenerationModalType] = useState<GenerationType | null>(null);
  const [editingCoursePlanId, setEditingCoursePlanId] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [showCompositeFromLibrary, setShowCompositeFromLibrary] = useState(false);

  const handleOpenGenerationModal = (type: GenerationType) => {
    setGenerationModalType(type);
  };

  const handleCloseGenerationModal = () => {
    setGenerationModalType(null);
  };

  const handleGenerated = () => {
    refreshStudio();
  };

  const handleQuickGenerate = async (type: GenerationType) => {
    if (!studio) return;
    const config = quickGenerateConfig[type];
    if (!config) return;

    // If this type requires modal (e.g. IMAGE), open modal instead
    if (config.requiresModal) {
      setGenerationModalType(type);
      return;
    }

    const sourceIds = Array.from(selectedSourceIds);

    try {
      if (config.legacyEndpoint) {
        // Legacy endpoints (PRESENTATION, COURSE_PLAN)
        const endpoint = config.legacyEndpoint.replace('{studioId}', studio.id);
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config.defaultInputs, sourceIds }),
        });
      } else if (config.templateId) {
        // Unified widget generation via template
        await fetch(`/api/studios/${studio.id}/widgets/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetTemplateId: config.templateId,
            title: config.defaultTitle,
            inputs: config.defaultInputs,
            sourceIds,
          }),
        });
      } else {
        // Direct creation (COMPOSED widgets without templates)
        const composedTypes = ['SEQUENCE', 'COURSE_MODULE'];
        const isComposed = composedTypes.includes(type);
        await fetch(`/api/studios/${studio.id}/widgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            title: config.defaultTitle,
            kind: isComposed ? 'COMPOSED' : 'LEAF',
            data: config.defaultInputs,
            status: 'READY',
          }),
        });
      }
      refreshStudio();
    } catch (err) {
      console.error('Error quick generating:', err);
    }
  };

  const handleCreateComposite = async (type: 'SEQUENCE' | 'COURSE_MODULE') => {
    if (!studio) return;
    try {
      const kind = 'COMPOSED';
      const title = type === 'SEQUENCE' ? 'Nouvelle sequence' : 'Nouveau module de cours';
      const composition = type === 'COURSE_MODULE' ? {
        kind: 'COMPOSED',
        slots: [
          { id: 'intro', name: 'Introduction', required: true, accepts: [{ tags: ['media', 'content'] }], maxChildren: 1 },
          { id: 'activities', name: 'Activites', required: false, accepts: [{ tags: ['interactive', 'assessment'] }] },
          { id: 'assessment', name: 'Evaluation', required: true, accepts: [{ tags: ['assessment'] }], maxChildren: 1 },
        ],
      } : {
        kind: 'COMPOSED',
        accepts: [{ tags: ['interactive', 'assessment', 'media', 'content'] }],
      };

      const res = await fetch(`/api/studios/${studio.id}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          kind,
          data: {},
          composition,
          status: 'READY',
        }),
      });

      if (res.ok) {
        refreshStudio();
        const result = await res.json();
        if (result.widget?.id) {
          setEditingWidgetId(result.widget.id);
        }
      }
    } catch (err) {
      console.error('Error creating composite:', err);
    }
  };

  const handleConvertToSource = async (widgetId?: string, coursePlanId?: string) => {
    if (!studio) return;
    try {
      const res = await fetch(`/api/studios/${studio.id}/sources/from-widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetId, coursePlanId }),
      });
      if (res.ok) {
        refreshStudio();
      } else {
        const data = await res.json();
        console.error('Error converting to source:', data.error);
      }
    } catch (err) {
      console.error('Error converting to source:', err);
    }
  };

  const handleOpenCoursePlan = (id: string) => {
    setEditingCoursePlanId(id);
  };

  const handleCloseCoursePlanEditor = () => {
    setEditingCoursePlanId(null);
  };

  const activeRunsCount = runs.filter(
    (r) => r.status === 'PENDING' || r.status === 'RUNNING'
  ).length;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Collapsed view
  if (isRightPanelCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mb-4"
          onClick={toggleRightPanel}
          title="Afficher le panneau"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-3">
          <div
            className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center"
            title="Generables"
          >
            <Sparkles className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="relative" title="Bibliotheque">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Library className="h-4 w-4 text-gray-500" />
            </div>
            {activeRunsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeRunsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h2 className="text-base font-medium">Actions</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleRightPanel}
          title="Masquer le panneau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Generables Section */}
        <div className="border-b border-gray-200">
          <button
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('generables')}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-600" />
              <span className="text-base font-medium">Generables</span>
            </div>
            {expandedSections.has('generables') ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {expandedSections.has('generables') && (
            <div className="px-3 pb-3 max-h-[50vh] overflow-y-auto">
              <GenerablesSection onQuickGenerate={handleQuickGenerate} onOpenGenerationModal={handleOpenGenerationModal} />
            </div>
          )}
        </div>

        {/* Library Section */}
        <div className="border-b border-gray-200">
          <button
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('library')}
          >
            <div className="flex items-center gap-2">
              <Library className="h-4 w-4 text-gray-500" />
              <span className="text-base font-medium">Bibliotheque</span>
            </div>
            {expandedSections.has('library') ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {expandedSections.has('library') && (
            <div className="px-3 pb-3">
              <LibrarySection
                studioId={studio?.id ?? ''}
                onOpenCoursePlan={handleOpenCoursePlan}
                onOpenWidget={(id) => {
                  // Navigate to dedicated page for composites
                  const widget = rootWidgets.find((w) => w.id === id);
                  if (widget && widget.kind === 'COMPOSED') {
                    router.push(`/studios/${studio?.id}/composites/${id}`);
                  } else {
                    setEditingWidgetId(id);
                  }
                }}
                onCreateComposite={handleCreateComposite}
                onCreateCompositeFromLibrary={() => setShowCompositeFromLibrary(true)}
                onConvertToSource={handleConvertToSource}
              />
            </div>
          )}
        </div>

      </div>

      {/* Generation Modal */}
      {studio && generationModalType && (
        <GenerationModal
          isOpen={!!generationModalType}
          onClose={handleCloseGenerationModal}
          type={generationModalType}
          studioId={studio.id}
          selectedSourceIds={selectedSourceIds}
          onGenerated={handleGenerated}
        />
      )}

      {/* Course Plan Editor Modal */}
      {studio && editingCoursePlanId && (
        <CoursePlanEditorModal
          isOpen={!!editingCoursePlanId}
          onClose={handleCloseCoursePlanEditor}
          coursePlanId={editingCoursePlanId}
          studioId={studio.id}
        />
      )}

      {/* Widget Detail Modal */}
      {studio && editingWidgetId && (
        <WidgetDetailModal
          isOpen={!!editingWidgetId}
          onClose={() => setEditingWidgetId(null)}
          widgetId={editingWidgetId}
          studioId={studio.id}
          onUpdated={refreshStudio}
          onDeleted={refreshStudio}
        />
      )}

      {/* Create Composite from Library Modal */}
      {studio && showCompositeFromLibrary && (
        <CreateCompositeFromLibraryModal
          isOpen={showCompositeFromLibrary}
          onClose={() => setShowCompositeFromLibrary(false)}
          studioId={studio.id}
          onCreated={refreshStudio}
        />
      )}
    </div>
  );
}
