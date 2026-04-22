'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, HelpCircle, MessageCircleQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import type { WidgetDisplayProps } from '../types';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqData {
  title?: string;
  items: FaqItem[];
}

/** Accordion item with smooth CSS height transition */
function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [item.answer]);

  const panelId = `faq-panel-${item.id}`;
  const headingId = `faq-heading-${item.id}`;

  return (
    <Card className="overflow-hidden">
      <button
        id={headingId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-sm pr-4">{item.question}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? `${height}px` : '0px' }}
      >
        <div ref={contentRef} className="px-4 pb-4 text-sm text-muted-foreground border-t pt-3">
          {item.answer}
        </div>
      </div>
    </Card>
  );
}

export function FaqDisplay({ data }: WidgetDisplayProps) {
  const faqData = data as unknown as FaqData;
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    // First item open by default
    const first = (faqData.items ?? [])[0];
    return first ? new Set([first.id]) : new Set<string>();
  });

  const toggleItem = useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (!faqData.items?.length) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground py-12 gap-3">
        <MessageCircleQuestion className="h-10 w-10 opacity-40" />
        <p className="text-sm">Aucune question. Generez une FAQ depuis vos sources.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {faqData.title && (
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{faqData.title}</h3>
        </div>
      )}
      {faqData.items.map((item) => (
        <AccordionItem
          key={item.id}
          item={item}
          isOpen={openItems.has(item.id)}
          onToggle={() => toggleItem(item.id)}
        />
      ))}
    </div>
  );
}
