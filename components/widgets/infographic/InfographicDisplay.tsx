'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  ArrowRight,
  Circle,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ComparisonColumn {
  header: string;
  items: string[];
}

interface InfographicSection {
  id: string;
  type: 'stat' | 'text' | 'list' | 'comparison';
  title?: string;
  content?: string;
  value?: string;
  label?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  items?: string[];
  listStyle?: 'check' | 'arrow' | 'dot';
  columns?: ComparisonColumn[];
}

interface InfographicData {
  title?: string;
  subtitle?: string;
  sections: InfographicSection[];
  colorScheme?: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';
}

/* ------------------------------------------------------------------ */
/*  Color schemes                                                      */
/* ------------------------------------------------------------------ */

const COLOR_SCHEMES: Record<string, { accent: string; accentBg: string; accentText: string; headerBg: string }> = {
  blue: { accent: 'text-blue-600', accentBg: 'bg-blue-50', accentText: 'text-blue-700', headerBg: 'bg-blue-600' },
  violet: { accent: 'text-violet-600', accentBg: 'bg-violet-50', accentText: 'text-violet-700', headerBg: 'bg-violet-600' },
  emerald: { accent: 'text-emerald-600', accentBg: 'bg-emerald-50', accentText: 'text-emerald-700', headerBg: 'bg-emerald-600' },
  amber: { accent: 'text-amber-600', accentBg: 'bg-amber-50', accentText: 'text-amber-700', headerBg: 'bg-amber-600' },
  rose: { accent: 'text-rose-600', accentBg: 'bg-rose-50', accentText: 'text-rose-700', headerBg: 'bg-rose-600' },
  slate: { accent: 'text-slate-600', accentBg: 'bg-slate-50', accentText: 'text-slate-700', headerBg: 'bg-slate-600' },
};

function useScheme(colorScheme?: string) {
  return COLOR_SCHEMES[colorScheme ?? 'blue'] ?? COLOR_SCHEMES.blue;
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedValue(targetValue: string, isVisible: boolean): string {
  const [display, setDisplay] = useState('0');
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isVisible) return;

    // Try to extract a numeric value to animate
    const numMatch = targetValue.match(/^([^\d]*)([\d,.]+)(.*)$/);
    if (!numMatch) {
      setDisplay(targetValue);
      return;
    }

    const prefix = numMatch[1];
    const numStr = numMatch[2].replace(/,/g, '');
    const suffix = numMatch[3];
    const target = parseFloat(numStr);

    if (isNaN(target)) {
      setDisplay(targetValue);
      return;
    }

    const isDecimal = numStr.includes('.');
    const decimalPlaces = isDecimal ? (numStr.split('.')[1]?.length ?? 0) : 0;
    const duration = 1200; // ms
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      const formatted = isDecimal ? current.toFixed(decimalPlaces) : Math.round(current).toLocaleString('fr-FR');
      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(targetValue);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetValue, isVisible]);

  return display;
}

/* ------------------------------------------------------------------ */
/*  Section renderers                                                  */
/* ------------------------------------------------------------------ */

function StatSection({
  section,
  scheme,
}: {
  section: InfographicSection;
  scheme: ReturnType<typeof useScheme>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const animatedValue = useAnimatedValue(section.value ?? '0', visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const TrendIcon = section.trend === 'up' ? TrendingUp : section.trend === 'down' ? TrendingDown : Minus;
  const trendColor = section.trend === 'up' ? 'text-emerald-500' : section.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground';

  return (
    <Card ref={ref} className={cn('p-5 text-center', scheme.accentBg, 'border-0')}>
      <div className={cn('text-3xl font-bold tabular-nums tracking-tight', scheme.accent)}>
        {animatedValue}
      </div>
      {(section.title || section.label) && (
        <div className="text-sm text-muted-foreground mt-1.5 font-medium">
          {section.title || section.label}
        </div>
      )}
      {section.trend && (
        <div className={cn('flex items-center justify-center gap-1 mt-2', trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium capitalize">{section.trend === 'up' ? 'Hausse' : section.trend === 'down' ? 'Baisse' : 'Stable'}</span>
        </div>
      )}
    </Card>
  );
}

function ListSection({
  section,
  scheme,
  isEven,
}: {
  section: InfographicSection;
  scheme: ReturnType<typeof useScheme>;
  isEven: boolean;
}) {
  const style = section.listStyle ?? 'check';
  const IconComponent = style === 'check' ? CheckCircle2 : style === 'arrow' ? ArrowRight : Circle;

  return (
    <Card className={cn('p-5 border-0', isEven ? scheme.accentBg : 'bg-background')}>
      {section.title && (
        <h4 className={cn('font-semibold text-sm mb-3', scheme.accentText)}>{section.title}</h4>
      )}
      <ul className="space-y-2">
        {section.items?.map((item, i) => (
          <li
            key={i}
            className={cn(
              'text-sm flex items-start gap-2.5 py-1 px-2 rounded-md transition-colors',
              i % 2 === 0 ? 'bg-muted/40' : 'bg-transparent',
            )}
          >
            <IconComponent className={cn('h-4 w-4 mt-0.5 shrink-0', scheme.accent)} />
            <span className="text-foreground/80">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ComparisonSection({
  section,
  scheme,
}: {
  section: InfographicSection;
  scheme: ReturnType<typeof useScheme>;
}) {
  const columns = section.columns ?? [];

  // Fallback: if no columns but content exists, render as text
  if (columns.length === 0 && section.content) {
    return (
      <Card className="p-5 border-0">
        {section.title && (
          <h4 className={cn('font-semibold text-sm mb-3', scheme.accentText)}>{section.title}</h4>
        )}
        <p className="text-sm text-muted-foreground">{section.content}</p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden border-0">
      {section.title && (
        <div className={cn('px-5 py-3', scheme.headerBg)}>
          <h4 className="font-semibold text-sm text-white">{section.title}</h4>
        </div>
      )}
      <div className={cn('grid divide-x divide-border', columns.length === 2 ? 'grid-cols-2' : `grid-cols-${Math.min(columns.length, 4)}`)}>
        {columns.map((col, ci) => (
          <div key={ci} className="p-4">
            <div className={cn('font-semibold text-sm mb-3 pb-2 border-b', scheme.accentText)}>
              {col.header}
            </div>
            <ul className="space-y-2">
              {col.items.map((item, ii) => (
                <li key={ii} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium', scheme.accentBg, scheme.accentText)}>
                    {ii + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TextSection({
  section,
  scheme,
  isEven,
}: {
  section: InfographicSection;
  scheme: ReturnType<typeof useScheme>;
  isEven: boolean;
}) {
  const content = section.content ?? '';
  const hasDropCap = content.length > 80;

  return (
    <Card className={cn('p-5 border-0', isEven ? scheme.accentBg : 'bg-background')}>
      {section.title && (
        <h4 className={cn('font-semibold text-sm mb-3', scheme.accentText)}>{section.title}</h4>
      )}
      <p
        className={cn(
          'text-sm text-foreground/80 leading-relaxed',
          hasDropCap && 'first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none',
          hasDropCap && scheme.accent.replace('text-', 'first-letter:text-'),
        )}
      >
        {content}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with divider                                       */
/* ------------------------------------------------------------------ */

function SectionRenderer({
  section,
  scheme,
  index,
}: {
  section: InfographicSection;
  scheme: ReturnType<typeof useScheme>;
  index: number;
}) {
  const isEven = index % 2 === 0;

  switch (section.type) {
    case 'stat':
      return <StatSection section={section} scheme={scheme} />;
    case 'list':
      return <ListSection section={section} scheme={scheme} isEven={isEven} />;
    case 'comparison':
      return <ComparisonSection section={section} scheme={scheme} />;
    case 'text':
    default:
      return <TextSection section={section} scheme={scheme} isEven={isEven} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Public Display                                                     */
/* ------------------------------------------------------------------ */

export function InfographicDisplay({ data }: WidgetDisplayProps) {
  const infographic = data as unknown as InfographicData;
  const scheme = useScheme(infographic.colorScheme);

  if (!infographic.sections?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune infographie disponible.
      </div>
    );
  }

  const stats = infographic.sections.filter((s) => s.type === 'stat');
  const others = infographic.sections.filter((s) => s.type !== 'stat');

  return (
    <div className="space-y-5">
      {/* Header */}
      {infographic.title && (
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', scheme.accentBg)}>
            <BarChart3 className={cn('h-5 w-5', scheme.accent)} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{infographic.title}</h3>
            {infographic.subtitle && (
              <p className="text-sm text-muted-foreground">{infographic.subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      {stats.length > 0 && (
        <div
          className={cn(
            'grid gap-3',
            stats.length === 1 && 'grid-cols-1',
            stats.length === 2 && 'grid-cols-2',
            stats.length >= 3 && 'grid-cols-2 sm:grid-cols-3',
          )}
        >
          {stats.map((s) => (
            <StatSection key={s.id} section={s} scheme={scheme} />
          ))}
        </div>
      )}

      {/* Other sections with dividers */}
      {others.length > 0 && (
        <div className="space-y-1">
          {others.map((s, i) => (
            <div key={s.id}>
              {i > 0 && (
                <div className="flex items-center py-1">
                  <div className={cn('flex-1 h-px', scheme.accentBg)} />
                </div>
              )}
              <SectionRenderer section={s} scheme={scheme} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
