'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Network,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

interface MindmapData {
  title?: string;
  root: MindmapNode;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEPTH_COLORS = [
  { bg: 'bg-primary/90', text: 'text-primary-foreground', border: 'border-primary/70' },
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
  { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-500' },
  { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-500' },
  { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-500' },
  { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-400' },
];

const STROKE_COLORS = [
  'stroke-primary/40',
  'stroke-blue-400/40',
  'stroke-violet-400/40',
  'stroke-amber-400/40',
  'stroke-emerald-400/40',
  'stroke-rose-400/40',
];

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;
const LABEL_TRUNCATE = 32;
const LAZY_DEPTH_THRESHOLD = 100; // node count threshold for lazy rendering

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function countNodes(node: MindmapNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) count += countNodes(child);
  }
  return count;
}

function truncateLabel(label: string, max: number): { text: string; truncated: boolean } {
  if (label.length <= max) return { text: label, truncated: false };
  return { text: label.slice(0, max) + '\u2026', truncated: true };
}

/* ------------------------------------------------------------------ */
/*  MindmapTree (inner renderer)                                       */
/* ------------------------------------------------------------------ */

function MindmapTree({
  root,
  isMobile,
}: {
  root: MindmapNode;
  isMobile: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<Line[]>([]);
  const [lineDepths, setLineDepths] = useState<number[]>([]);
  const [version, setVersion] = useState(0);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const totalNodes = useMemo(() => countNodes(root), [root]);
  const isLazy = totalNodes > LAZY_DEPTH_THRESHOLD;

  // Auto-collapse deep branches for large trees
  useEffect(() => {
    if (isLazy) {
      const toCollapse = new Set<string>();
      function walk(node: MindmapNode, depth: number) {
        if (depth >= 2 && node.children && node.children.length > 0) {
          toCollapse.add(node.id);
        }
        node.children?.forEach((c) => walk(c, depth + 1));
      }
      walk(root, 0);
      setCollapsed(toCollapse);
    }
  }, [root, isLazy]);

  const toggle = useCallback((nodeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setVersion((v) => v + 1);
  }, []);

  /* ---------- Line computation ---------- */

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const rect = container.getBoundingClientRect();
    const newLines: Line[] = [];
    const depths: number[] = [];
    const positions = new Map<string, NodePosition>();

    container.querySelectorAll<HTMLElement>('[data-node-id]').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      if (!id) return;
      const r = el.getBoundingClientRect();
      positions.set(id, {
        x: r.left - rect.left,
        y: r.top - rect.top,
        width: r.width,
        height: r.height,
      });
    });

    function traverse(node: MindmapNode, depth: number) {
      if (collapsed.has(node.id) || !node.children) return;
      const parentPos = positions.get(node.id);
      if (!parentPos) return;

      for (const child of node.children) {
        const childPos = positions.get(child.id);
        if (childPos) {
          if (isMobile) {
            // Vertical layout: parent bottom -> child top
            newLines.push({
              x1: parentPos.x + parentPos.width / 2,
              y1: parentPos.y + parentPos.height,
              x2: childPos.x + childPos.width / 2,
              y2: childPos.y,
            });
          } else {
            // Horizontal layout: parent right -> child left
            newLines.push({
              x1: parentPos.x + parentPos.width,
              y1: parentPos.y + parentPos.height / 2,
              x2: childPos.x,
              y2: childPos.y + childPos.height / 2,
            });
          }
          depths.push(depth);
        }
        traverse(child, depth + 1);
      }
    }

    traverse(root, 0);
    setLines(newLines);
    setLineDepths(depths);
    svg.setAttribute('width', String(container.scrollWidth));
    svg.setAttribute('height', String(container.scrollHeight));
  }, [root, collapsed, isMobile]);

  useEffect(() => {
    const timer = setTimeout(computeLines, 60);
    return () => clearTimeout(timer);
  }, [computeLines, version]);

  useEffect(() => {
    const observer = new ResizeObserver(computeLines);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [computeLines]);

  /* ---------- Zoom ---------- */

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    const container = containerRef.current;
    if (!viewport || !container) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cw = container.scrollWidth;
    const ch = container.scrollHeight;
    if (cw === 0 || ch === 0) return;
    const fitScale = Math.min(vw / cw, vh / ch, 1) * 0.92;
    setScale(fitScale);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Mouse-wheel zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((s) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        return Math.min(Math.max(s + delta, ZOOM_MIN), ZOOM_MAX);
      });
    }
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, []);

  /* ---------- Pan ---------- */

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only pan on middle-click or when target is viewport background
      const target = e.target as HTMLElement;
      if (e.button !== 1 && !target.closest('[data-pan-area]')) return;
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [translate],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setTranslate({ x: panStartRef.current.tx + dx, y: panStartRef.current.ty + dy });
  }, []);

  const onPointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  /* ---------- Tooltip ---------- */

  const showTooltip = useCallback((label: string, e: React.MouseEvent) => {
    const { text, truncated } = truncateLabel(label, LABEL_TRUNCATE);
    if (!truncated) return;
    void text;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text: label, x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  /* ---------- Node renderer ---------- */

  function renderNode(node: MindmapNode, depth: number): React.ReactNode {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const colors = DEPTH_COLORS[depth % DEPTH_COLORS.length];
    const childCount = node.children?.length ?? 0;
    const { text: displayLabel, truncated } = truncateLabel(node.label, LABEL_TRUNCATE);

    const flexDir = isMobile ? 'flex-col' : 'flex-row items-center';
    const childGap = isMobile ? 'gap-3 ml-4' : 'gap-3';
    const childFlex = isMobile ? 'flex flex-col' : 'flex flex-col';

    return (
      <div key={node.id} className={cn('flex', flexDir, 'gap-4')}>
        {/* Node pill + toggle */}
        <div className={cn('flex items-center gap-0 shrink-0', isMobile && 'flex-row')}>
          <div
            data-node-id={node.id}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shadow-sm',
              'transition-all duration-200',
              'border',
              colors.bg,
              colors.text,
              colors.border,
              depth === 0 && 'text-base px-5 py-2.5 shadow-md',
            )}
            onMouseEnter={truncated ? (e) => showTooltip(node.label, e) : undefined}
            onMouseLeave={truncated ? hideTooltip : undefined}
          >
            {displayLabel}
          </div>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full border-2 shadow-sm',
                'transition-all duration-200 hover:scale-110',
                'bg-background border-muted-foreground/20 text-muted-foreground hover:border-primary hover:text-primary',
                isMobile ? '-mb-1 mt-1' : '-ml-1',
              )}
              title={isCollapsed ? `Developper (${childCount})` : 'Replier'}
            >
              {isCollapsed ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  {childCount > 0 && (
                    <span className="sr-only">{childCount} enfant(s)</span>
                  )}
                </>
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {/* Collapsed badge */}
          {hasChildren && isCollapsed && (
            <span className="ml-1 text-[10px] text-muted-foreground font-medium tabular-nums">
              +{childCount}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div className={cn(childFlex, childGap)}>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border p-1 shadow-sm">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] font-mono text-muted-foreground w-9 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fitToScreen} title="Ajuster a l'ecran">
          <Maximize className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Viewport with pan */}
      <div
        ref={viewportRef}
        data-pan-area
        className="overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ minHeight: 200 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isPanningRef.current ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <div ref={containerRef} className="relative inline-flex items-center min-w-full p-4">
            <svg
              ref={svgRef}
              className="absolute inset-0 pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              {lines.map((line, i) => {
                const strokeClass = STROKE_COLORS[(lineDepths[i] ?? 0) % STROKE_COLORS.length];
                if (isMobile) {
                  const midY = (line.y1 + line.y2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`}
                      fill="none"
                      strokeWidth={1.5}
                      className={cn('transition-all duration-300', strokeClass)}
                    />
                  );
                }
                const midX = (line.x1 + line.x2) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                    fill="none"
                    strokeWidth={1.5}
                    className={cn('transition-all duration-300', strokeClass)}
                  />
                );
              })}
            </svg>
            <div className="relative z-10">{renderNode(root, 0)}</div>
          </div>
        </div>
      </div>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-1.5 rounded-lg bg-popover text-popover-foreground text-xs shadow-lg border max-w-xs pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public Display component                                           */
/* ------------------------------------------------------------------ */

export function MindmapDisplay({ data }: WidgetDisplayProps) {
  const mindmap = data as unknown as MindmapData;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!mindmap.root) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune carte mentale disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mindmap.title && (
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{mindmap.title}</h3>
        </div>
      )}
      <Card className="p-6 overflow-hidden relative">
        <MindmapTree root={mindmap.root} isMobile={isMobile} />
      </Card>
    </div>
  );
}
