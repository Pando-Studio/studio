'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Input, Label } from '@/components/ui';
import {
  AlertCircle,
  Bold,
  Italic,
  Heading2,
  Heading3,
  ListOrdered,
  Quote,
  Code,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetEditorProps } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportFormat = 'synthesis' | 'study-guide' | 'blog-article' | 'custom';

interface ReportData {
  title: string;
  format: ReportFormat;
  language: string;
  instructions?: string;
  content: string;
  wordCount?: number;
  sourceCount?: number;
}

// ---------------------------------------------------------------------------
// Toolbar actions
// ---------------------------------------------------------------------------

interface ToolbarAction {
  icon: typeof Bold;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: Bold, label: 'Gras', prefix: '**', suffix: '**' },
  { icon: Italic, label: 'Italique', prefix: '_', suffix: '_' },
  { icon: Heading2, label: 'Titre 2', prefix: '## ', suffix: '', block: true },
  { icon: Heading3, label: 'Titre 3', prefix: '### ', suffix: '', block: true },
  { icon: ListOrdered, label: 'Liste', prefix: '- ', suffix: '', block: true },
  { icon: Quote, label: 'Citation', prefix: '> ', suffix: '', block: true },
  { icon: Code, label: 'Code', prefix: '`', suffix: '`' },
];

// ---------------------------------------------------------------------------
// Markdown preview components (simplified vs. Display)
// ---------------------------------------------------------------------------

function buildPreviewComponents(): Components {
  return {
    table({ children }) {
      return (
        <div className="overflow-x-auto my-2 border rounded">
          <table className="w-full text-xs">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-muted/50">{children}</thead>;
    },
    th({ children }) {
      return <th className="px-2 py-1 text-left font-medium text-muted-foreground border-b text-xs">{children}</th>;
    },
    tr({ children }) {
      return <tr className="border-b last:border-0 even:bg-muted/20">{children}</tr>;
    },
    td({ children }) {
      return <td className="px-2 py-1 text-xs">{children}</td>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-primary/40 bg-primary/5 pl-3 py-1 my-2 italic text-muted-foreground rounded-r text-xs">
          {children}
        </blockquote>
      );
    },
    code({ className, children }) {
      const isInline = !className;
      if (isInline) {
        return <code className="rounded bg-muted/60 px-1 py-0.5 text-xs font-mono">{children}</code>;
      }
      return (
        <pre className="rounded bg-muted/60 p-3 overflow-x-auto text-xs">
          <code className={className}>{children}</code>
        </pre>
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countChars(text: string): number {
  return text.length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportEditor({ data, onSave }: WidgetEditorProps) {
  const [reportData, setReportData] = useState<ReportData>(() => ({
    title: '',
    format: 'synthesis',
    language: 'fr',
    content: '',
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as ReportData));
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const previewComponents = useMemo(() => buildPreviewComponents(), []);
  const wordCount = useMemo(() => countWords(reportData.content), [reportData.content]);
  const charCount = useMemo(() => countChars(reportData.content), [reportData.content]);

  const applyToolbarAction = useCallback(
    (action: ToolbarAction) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = reportData.content;
      const selected = text.slice(start, end);

      let replacement: string;
      let cursorOffset: number;

      if (action.block) {
        // Block-level: insert prefix at line start
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const before = text.slice(0, lineStart);
        const after = text.slice(lineStart);
        const newContent = before + action.prefix + after;
        setReportData((prev) => ({ ...prev, content: newContent }));
        cursorOffset = start + action.prefix.length;
      } else {
        replacement = action.prefix + (selected || 'texte') + action.suffix;
        const newContent = text.slice(0, start) + replacement + text.slice(end);
        setReportData((prev) => ({ ...prev, content: newContent }));
        cursorOffset = start + action.prefix.length + (selected || 'texte').length;
      }

      // Restore focus + cursor
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorOffset, cursorOffset);
      });
    },
    [reportData.content],
  );

  const handleSave = () => {
    if (!reportData.content.trim()) {
      setError('Le contenu est obligatoire.');
      return;
    }
    setError(null);
    const payload: ReportData = {
      ...reportData,
      wordCount,
    };
    onSave(payload as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="report-title">Titre</Label>
        <Input
          id="report-title"
          placeholder="Titre du rapport..."
          value={reportData.title}
          onChange={(e) => setReportData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="report-format">Format</Label>
          <select
            id="report-format"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={reportData.format}
            onChange={(e) =>
              setReportData((prev) => ({
                ...prev,
                format: e.target.value as ReportFormat,
              }))
            }
          >
            <option value="synthesis">Synthese</option>
            <option value="study-guide">Guide d&apos;etude</option>
            <option value="blog-article">Article de blog</option>
            <option value="custom">Personnalise</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-language">Langue</Label>
          <select
            id="report-language"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={reportData.language}
            onChange={(e) =>
              setReportData((prev) => ({ ...prev, language: e.target.value }))
            }
          >
            <option value="fr">Francais</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-instructions">Instructions (optionnel)</Label>
        <textarea
          id="report-instructions"
          className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Preciser la structure, le style, le ton..."
          value={reportData.instructions ?? ''}
          onChange={(e) =>
            setReportData((prev) => ({ ...prev, instructions: e.target.value }))
          }
        />
      </div>

      {/* Markdown editor with toolbar + preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Contenu (Markdown)</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((prev) => !prev)}
            className="gap-1.5 text-xs"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPreview ? 'Masquer apercu' : 'Apercu'}
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 p-1 border rounded-t-md bg-muted/30">
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              onClick={() => applyToolbarAction(action)}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <action.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Editor + Preview split */}
        <div className={cn('grid gap-0 border rounded-b-md overflow-hidden', showPreview ? 'grid-cols-2' : 'grid-cols-1')}>
          <textarea
            ref={textareaRef}
            className={cn(
              'min-h-[350px] px-3 py-2 text-sm font-mono resize-y focus:outline-none',
              showPreview && 'border-r',
            )}
            placeholder="# Titre&#10;&#10;## Section&#10;&#10;Contenu en markdown..."
            value={reportData.content}
            onChange={(e) =>
              setReportData((prev) => ({ ...prev, content: e.target.value }))
            }
          />
          {showPreview && (
            <div className="min-h-[350px] max-h-[500px] overflow-y-auto px-4 py-2 bg-muted/10">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={previewComponents}>
                  {reportData.content || '*Apercu vide*'}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Word / char count */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{wordCount} mot{wordCount !== 1 ? 's' : ''}</span>
          <span>{charCount} caractere{charCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
