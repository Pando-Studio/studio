'use client';

import { useState, useCallback } from 'react';
import { SlidesSidebar } from './SlidesSidebar';
import { SlideEditor } from './SlideEditor';
import { SlideRenderer } from './SlideRenderer';
import { cn } from '@/lib/utils';

interface Slide {
  id: string;
  order: number;
  content: {
    title: string;
    patternId: string;
    html: string;
    isInteractive: boolean;
    type: string;
    widgetRef?: { id: string; path: string } | null;
    imageUrl?: string;
  };
  notes?: string;
}

interface Presentation {
  id: string;
  title: string;
  studioId: string;
  studioTitle: string;
  status: string;
  version: number;
  slides: Slide[];
}

interface PresentationEditorProps {
  presentation: Presentation;
  onSlideUpdate: (slideId: string, content: object) => Promise<void>;
  onSlidesReorder: (newOrder: string[]) => Promise<void>;
}

type ViewMode = 'editor' | 'preview' | 'split';

export function PresentationEditor({
  presentation,
  onSlideUpdate,
  onSlidesReorder,
}: PresentationEditorProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    presentation.slides[0]?.id || null
  );
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSaving, setIsSaving] = useState(false);

  const selectedSlide = presentation.slides.find((s) => s.id === selectedSlideId);

  const handleSlideSelect = useCallback((slideId: string) => {
    setSelectedSlideId(slideId);
  }, []);

  const handleSlideContentChange = useCallback(
    async (html: string) => {
      if (!selectedSlide) return;

      setIsSaving(true);
      try {
        await onSlideUpdate(selectedSlide.id, {
          ...selectedSlide.content,
          html,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [selectedSlide, onSlideUpdate]
  );

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      onSlidesReorder(newOrder);
    },
    [onSlidesReorder]
  );

  return (
    <div className="h-full flex">
      {/* Sidebar with slide thumbnails */}
      <SlidesSidebar
        slides={presentation.slides}
        selectedSlideId={selectedSlideId}
        onSlideSelect={handleSlideSelect}
        onReorder={handleReorder}
      />

      {/* Main editor area */}
      <div className="flex-1 flex flex-col">
        {/* View mode toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Slide {selectedSlide ? selectedSlide.order + 1 : '-'} / {presentation.slides.length}
            </span>
            {isSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Sauvegarde...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setViewMode('editor')}
              className={cn(
                'px-3 py-1 text-sm rounded transition-colors',
                viewMode === 'editor'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              Code
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'px-3 py-1 text-sm rounded transition-colors',
                viewMode === 'split'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                'px-3 py-1 text-sm rounded transition-colors',
                viewMode === 'preview'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              Apercu
            </button>
          </div>
        </div>

        {/* Editor/Preview area */}
        <div className="flex-1 overflow-hidden">
          {selectedSlide ? (
            <div
              className={cn(
                'h-full',
                viewMode === 'split' && 'grid grid-cols-2'
              )}
            >
              {/* Editor panel */}
              {(viewMode === 'editor' || viewMode === 'split') && (
                <div
                  className={cn(
                    'h-full overflow-hidden',
                    viewMode === 'split' && 'border-r'
                  )}
                >
                  <SlideEditor
                    slide={selectedSlide}
                    onContentChange={handleSlideContentChange}
                  />
                </div>
              )}

              {/* Preview panel */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="h-full overflow-auto bg-muted/20 p-4">
                  <SlideRenderer
                    html={selectedSlide.content.html}
                    title={selectedSlide.content.title}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Selectionnez une slide pour l'editer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
