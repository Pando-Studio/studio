'use client';

import { useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  Sparkles,
  HelpCircle,
  ListChecks,
  BookOpen,
  FileText,
  StickyNote,
  ArrowUpDown,
  Users,
  Clock,
  Network,
  BarChart3,
  Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetData, WidgetType } from '@/components/widgets/types';
import type { GenerationType } from '@/components/studio/modals/GenerationModal';

// Widget types that can serve as source for cascade generation
// (those with textual content in `data` or markdown-like fields)
const SOURCE_WIDGET_TYPES: WidgetType[] = [
  'SYLLABUS',
  'SESSION_PLAN',
  'PROGRAM_OVERVIEW',
  'CLASS_OVERVIEW',
  'REPORT',
  'SUMMARY',
  'FAQ',
  'GLOSSARY',
  'TIMELINE',
  'MINDMAP',
];

// Generable target types — what can be generated from a source widget
const GENERABLE_TARGETS: Array<{
  type: GenerationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { type: 'QUIZ', label: 'Quiz', icon: HelpCircle, color: 'text-blue-500' },
  { type: 'QCM', label: 'QCM', icon: ListChecks, color: 'text-indigo-600' },
  { type: 'FLASHCARD', label: 'Flashcards', icon: Library, color: 'text-lime-500' },
  { type: 'MULTIPLE_CHOICE', label: 'Choix Multiple', icon: ListChecks, color: 'text-indigo-500' },
  { type: 'RANKING', label: 'Classement', icon: ArrowUpDown, color: 'text-rose-500' },
  { type: 'POSTIT', label: 'Post-it', icon: StickyNote, color: 'text-yellow-500' },
  { type: 'ROLEPLAY', label: 'Roleplay', icon: Users, color: 'text-green-500' },
  { type: 'FAQ', label: 'FAQ', icon: HelpCircle, color: 'text-amber-500' },
  { type: 'GLOSSARY', label: 'Glossaire', icon: BookOpen, color: 'text-sky-500' },
  { type: 'SUMMARY', label: 'Resume', icon: FileText, color: 'text-slate-500' },
  { type: 'TIMELINE', label: 'Frise', icon: Clock, color: 'text-fuchsia-500' },
  { type: 'REPORT', label: 'Rapport', icon: FileText, color: 'text-stone-500' },
  { type: 'MINDMAP', label: 'Carte mentale', icon: Network, color: 'text-teal-500' },
  { type: 'INFOGRAPHIC', label: 'Infographie', icon: BarChart3, color: 'text-indigo-400' },
];

/**
 * Check whether a widget has textual content that can serve as generation source.
 */
export function canGenerateFrom(widget: WidgetData): boolean {
  if (!widget.data) return false;

  // Explicit type check
  if (SOURCE_WIDGET_TYPES.includes(widget.type)) return true;

  // Fallback: check if `data` contains a `content` or `markdown` string field
  const data = widget.data;
  if (typeof data.content === 'string' && data.content.length > 50) return true;
  if (typeof data.markdown === 'string' && data.markdown.length > 50) return true;

  return false;
}

interface GenerateFromWidgetButtonProps {
  widget: WidgetData;
  studioId: string;
  onGenerate: (type: GenerationType, parentWidget: WidgetData) => void;
  variant?: 'default' | 'icon';
  className?: string;
}

export function GenerateFromWidgetButton({
  widget,
  studioId: _studioId,
  onGenerate,
  variant = 'default',
  className,
}: GenerateFromWidgetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canGenerateFrom(widget)) return null;

  // Filter out generating the same type as the source
  const targets = GENERABLE_TARGETS.filter((t) => t.type !== widget.type);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <button
            className={cn(
              'p-1 hover:bg-muted rounded transition-colors',
              className
            )}
            title="Generer a partir de ce widget"
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1.5', className)}
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
            Generer a partir de...
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Generer depuis &laquo;{widget.title}&raquo;
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {targets.map((target) => {
          const Icon = target.icon;
          return (
            <DropdownMenuItem
              key={target.type}
              onClick={() => {
                onGenerate(target.type, widget);
                setIsOpen(false);
              }}
              className="cursor-pointer"
            >
              <Icon className={cn('h-4 w-4', target.color)} />
              <span>{target.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
