'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, ChevronDown, List, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

interface SummarySection {
  heading: string;
  bullets: string[];
}

interface SummaryData {
  title?: string;
  sections: SummarySection[];
  sourceDocuments?: string[];
}

/** Collapsible section with smooth height animation */
function CollapsibleSection({
  section,
  index,
  defaultOpen,
}: {
  section: SummarySection;
  index: number;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [section.bullets]);

  const sectionId = `summary-section-${index}`;
  const headingId = `summary-heading-${index}`;

  return (
    <div>
      <button
        id={headingId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="flex w-full items-center justify-between border-b pb-1 group"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <h4 className="font-semibold text-sm">{section.heading}</h4>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      <div
        id={sectionId}
        role="region"
        aria-labelledby={headingId}
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? `${height}px` : '0px' }}
      >
        <div ref={contentRef}>
          <ul className="space-y-1.5 pl-4 pt-2">
            {section.bullets.map((bullet, bIndex) => (
              <li
                key={bIndex}
                className="text-sm text-muted-foreground list-disc"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SummaryDisplay({ data }: WidgetDisplayProps) {
  const summaryData = data as unknown as SummaryData;
  const sections = summaryData.sections ?? [];
  const showToc = sections.length > 5;
  const useCollapsible = sections.length > 3;

  const scrollToSection = useCallback((index: number) => {
    const el = document.getElementById(`summary-section-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  if (!sections.length) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground py-12 gap-3">
        <ClipboardList className="h-10 w-10 opacity-40" />
        <p className="text-sm">Aucun contenu. Generez un resume depuis vos sources.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summaryData.title && (
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{summaryData.title}</h3>
        </div>
      )}

      {/* Table of contents for 5+ sections */}
      {showToc && (
        <nav className="p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sommaire
            </span>
          </div>
          <ol className="space-y-1 pl-4">
            {sections.map((section, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => scrollToSection(index)}
                  className="text-sm text-primary hover:underline text-left"
                >
                  {section.heading}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {useCollapsible
        ? sections.map((section, index) => (
            <CollapsibleSection
              key={index}
              section={section}
              index={index}
              defaultOpen={index < 3}
            />
          ))
        : sections.map((section, index) => (
            <div key={index} id={`summary-section-${index}`} className="space-y-2">
              <h4 className="font-semibold text-sm border-b pb-1">{section.heading}</h4>
              <ul className="space-y-1.5 pl-4">
                {section.bullets.map((bullet, bIndex) => (
                  <li
                    key={bIndex}
                    className="text-sm text-muted-foreground list-disc"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}

      {summaryData.sourceDocuments && summaryData.sourceDocuments.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Sources : {summaryData.sourceDocuments.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
