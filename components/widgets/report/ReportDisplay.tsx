'use client';

import { useState, useMemo, useCallback, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Quote, Copy, Check, List } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportCitation {
  text: string;
  sourceId?: string;
  sourceTitle?: string;
}

interface ReportData {
  title?: string;
  format?: 'synthesis' | 'study-guide' | 'blog-article' | 'custom';
  language?: string;
  content: string;
  wordCount?: number;
  sourceCount?: number;
  citations?: ReportCitation[];
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<string, string> = {
  synthesis: 'Synthese',
  'study-guide': "Guide d'etude",
  'blog-article': 'Article de blog',
  custom: 'Personnalise',
};

/** Derive a URL-safe slug from heading text. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extract h2/h3 headings from raw Markdown (cheap regex scan). */
function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    entries.push({ id: slugify(text), text, level });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Copy button (shown top-right of the report)
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copie !' : 'Copier'}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Code block with inline copy
// ---------------------------------------------------------------------------

function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const lang = className?.replace('language-', '') ?? '';

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative group">
      {lang && (
        <span className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 select-none">
          {lang}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-muted/80 hover:bg-muted text-muted-foreground"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <pre className={cn('rounded-lg bg-muted/60 p-4 overflow-x-auto text-sm', lang && 'pt-8')}>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown component overrides
// ---------------------------------------------------------------------------

function buildComponents(): Components {
  /* heading factory: renders anchor id + hover link */
  const heading = (level: 2 | 3 | 4) => {
    const Tag = `h${level}` as const;
    return function HeadingComponent({ children }: { children?: ReactNode }) {
      const text = String(children);
      const id = slugify(text);
      return (
        <Tag id={id} className="scroll-mt-20 group">
          {children}
          <a
            href={`#${id}`}
            className="ml-2 opacity-0 group-hover:opacity-60 text-muted-foreground text-sm no-underline"
            aria-label={`Lien vers ${text}`}
          >
            #
          </a>
        </Tag>
      );
    };
  };

  return {
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    code({ className, children, ...rest }) {
      const isInline = !className;
      if (isInline) {
        return (
          <code
            className="rounded bg-muted/60 px-1.5 py-0.5 text-sm font-mono"
            {...rest}
          >
            {children}
          </code>
        );
      }
      return <CodeBlock className={className}>{children}</CodeBlock>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-primary/40 bg-primary/5 pl-4 py-2 my-3 italic text-muted-foreground rounded-r">
          {children}
        </blockquote>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-4 border rounded-lg">
          <table className="w-full text-sm">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-muted/50">{children}</thead>;
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b">
          {children}
        </th>
      );
    },
    tr({ children }) {
      return <tr className="border-b last:border-0 even:bg-muted/20">{children}</tr>;
    },
    td({ children }) {
      return <td className="px-3 py-2">{children}</td>;
    },
    img({ src, alt }) {
      return (
        <img
          src={src}
          alt={alt ?? ''}
          className="rounded-lg max-w-full h-auto my-4"
          loading="lazy"
        />
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReportDisplay({ data }: WidgetDisplayProps) {
  const reportData = data as unknown as ReportData;
  const components = useMemo(() => buildComponents(), []);
  const toc = useMemo(
    () => (reportData.content ? extractToc(reportData.content) : []),
    [reportData.content],
  );

  if (!reportData.content) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun contenu disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {reportData.title && (
            <>
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-lg font-semibold">{reportData.title}</h3>
            </>
          )}
        </div>
        <CopyButton text={reportData.content} />
      </div>

      {/* Meta badges */}
      {reportData.format && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
            {FORMAT_LABELS[reportData.format] ?? reportData.format}
          </span>
          {reportData.wordCount != null && reportData.wordCount > 0 && (
            <span>{reportData.wordCount} mots</span>
          )}
          {reportData.sourceCount != null && reportData.sourceCount > 0 && (
            <span>{reportData.sourceCount} sources</span>
          )}
        </div>
      )}

      {/* Table of contents (inline, shown when >= 3 headings) */}
      {toc.length >= 3 && (
        <nav className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <List className="h-4 w-4 text-muted-foreground" />
            Sommaire
          </div>
          <ul className="space-y-1">
            {toc.map((entry) => (
              <li
                key={entry.id}
                className={cn('text-sm', entry.level === 3 && 'ml-4')}
              >
                <a
                  href={`#${entry.id}`}
                  className="text-muted-foreground hover:text-foreground transition-colors no-underline"
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Markdown body */}
      <div
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5',
          'prose-headings:my-3',
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {reportData.content}
        </ReactMarkdown>
      </div>

      {/* Citations */}
      {reportData.citations && reportData.citations.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Quote className="h-4 w-4 text-muted-foreground" />
            Citations
          </div>
          {reportData.citations.map((citation, index) => (
            <Card key={index} className="p-3">
              <p className="text-sm italic text-muted-foreground">
                &quot;{citation.text}&quot;
              </p>
              {citation.sourceTitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  — {citation.sourceTitle}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
