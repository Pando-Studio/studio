'use client';

import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCitationNavigation } from '@/lib/stores/citation-navigation';

interface CitationMap {
  [sourceName: string]: { sourceId: string; chunkId?: string; excerpt?: string };
}

// ---------------------------------------------------------------------------
// Citation Tooltip
// ---------------------------------------------------------------------------

function CitationTooltip({ excerpt, children }: { excerpt?: string; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!excerpt) return <>{children}</>;

  return (
    <span
      className="relative inline"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-xs p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 pointer-events-none">
          <span className="block max-h-24 overflow-hidden leading-relaxed">
            {excerpt.length > 200 ? `${excerpt.substring(0, 200)}...` : excerpt}
          </span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Citation Badge (source)
// ---------------------------------------------------------------------------

function CitationBadge({
  sourceName,
  sourceId,
  chunkId,
  excerpt,
}: {
  sourceName: string;
  sourceId?: string;
  chunkId?: string;
  excerpt?: string;
}) {
  const { highlightSource } = useCitationNavigation();

  return (
    <CitationTooltip excerpt={excerpt}>
      <button
        type="button"
        onClick={() => {
          if (sourceId) highlightSource(sourceId, chunkId);
        }}
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-800 text-xs font-medium mx-0.5 align-baseline',
          sourceId && 'cursor-pointer hover:bg-primary/20 transition-colors',
        )}
      >
        <FileText className="h-3 w-3 mr-0.5 flex-shrink-0" />
        {sourceName}
      </button>
    </CitationTooltip>
  );
}

// ---------------------------------------------------------------------------
// Widget Citation Badge
// ---------------------------------------------------------------------------

function WidgetCitationBadge({ widgetTitle }: { widgetTitle: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-medium mx-0.5 align-baseline">
      <Boxes className="h-3 w-3 mr-0.5 flex-shrink-0" />
      {widgetTitle}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Text rendering with citations
// ---------------------------------------------------------------------------

function renderTextWithCitations(
  text: string,
  citationMap: CitationMap,
): React.ReactNode[] {
  // Match both [Source: name] and [Widget: name] patterns
  const regex = /\[(Source|Widget):\s*([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const type = match[1];
    const name = match[2].trim();

    if (type === 'Widget') {
      parts.push(
        <WidgetCitationBadge key={match.index} widgetTitle={name} />,
      );
    } else {
      const info = citationMap[name];
      parts.push(
        <CitationBadge
          key={match.index}
          sourceName={name}
          sourceId={info?.sourceId}
          chunkId={info?.chunkId}
          excerpt={info?.excerpt}
        />,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ---------------------------------------------------------------------------
// MarkdownMessage
// ---------------------------------------------------------------------------

interface MarkdownMessageProps {
  content: string;
  citationMap?: CitationMap;
  className?: string;
}

export function MarkdownMessage({ content, citationMap = {}, className }: MarkdownMessageProps) {
  const processChildren = useCallback(
    (children: React.ReactNode): React.ReactNode => {
      if (!children) return children;
      if (!Array.isArray(children)) {
        if (typeof children === 'string') {
          return renderTextWithCitations(children, citationMap);
        }
        return children;
      }
      return children.map((child, i) => {
        if (typeof child === 'string') {
          const parts = renderTextWithCitations(child, citationMap);
          return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <span key={i}>{parts}</span>;
        }
        return child;
      });
    },
    [citationMap],
  );

  return (
    <div
      className={cn(
        'text-sm prose prose-sm dark:prose-invert max-w-none',
        'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
        'prose-headings:my-2 prose-pre:my-2 prose-blockquote:my-1',
        'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs',
        'prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-3',
        className,
      )}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
