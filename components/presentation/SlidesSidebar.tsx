'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui';
import { Plus, GripVertical, Play, HelpCircle, Cloud, Users } from 'lucide-react';
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
  };
}

interface SlidesSidebarProps {
  slides: Slide[];
  selectedSlideId: string | null;
  onSlideSelect: (slideId: string) => void;
  onReorder: (newOrder: string[]) => void;
}

const INTERACTIVE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quiz: HelpCircle,
  wordcloud: Cloud,
  atelier: Users,
};

export function SlidesSidebar({
  slides,
  selectedSlideId,
  onSlideSelect,
  onReorder,
}: SlidesSidebarProps) {
  const sortedSlides = [...slides].sort((a, b) => a.order - b.order);

  // Simple drag and drop handler
  const handleDragStart = useCallback(
    (e: React.DragEvent, slideId: string) => {
      e.dataTransfer.setData('text/plain', slideId);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSlideId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');

      if (draggedId === targetSlideId) return;

      const currentOrder = sortedSlides.map((s) => s.id);
      const draggedIndex = currentOrder.indexOf(draggedId);
      const targetIndex = currentOrder.indexOf(targetSlideId);

      // Remove dragged item and insert at new position
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedId);

      onReorder(currentOrder);
    },
    [sortedSlides, onReorder]
  );

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm">Slides</h3>
      </div>

      {/* Slides list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sortedSlides.map((slide) => {
          const isSelected = slide.id === selectedSlideId;
          const InteractiveIcon = slide.content.isInteractive
            ? INTERACTIVE_ICONS[slide.content.type] || Play
            : null;

          return (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => handleDragStart(e, slide.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, slide.id)}
              onClick={() => onSlideSelect(slide.id)}
              className={cn(
                'group relative rounded-lg border bg-background cursor-pointer transition-all',
                isSelected
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary/50'
              )}
            >
              {/* Drag handle */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Slide preview */}
              <div className="p-3 pl-6">
                {/* Slide number */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {slide.order + 1}
                  </span>
                  {InteractiveIcon && (
                    <InteractiveIcon className="h-3 w-3 text-primary" />
                  )}
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      slide.content.patternId === 'simple' && 'bg-blue-100 text-blue-700',
                      slide.content.patternId === 'smart-layout' && 'bg-green-100 text-green-700',
                      slide.content.patternId === 'media' && 'bg-purple-100 text-purple-700',
                      slide.content.patternId === 'interactive' && 'bg-orange-100 text-orange-700'
                    )}
                  >
                    {slide.content.patternId}
                  </span>
                </div>

                {/* Slide title */}
                <p className="text-sm font-medium truncate">
                  {slide.content.title || 'Sans titre'}
                </p>

                {/* Mini preview placeholder */}
                <div className="mt-2 aspect-video bg-muted rounded border overflow-hidden">
                  <div
                    className="w-full h-full scale-[0.15] origin-top-left"
                    style={{
                      width: '666%',
                      height: '666%',
                    }}
                    dangerouslySetInnerHTML={{ __html: slide.content.html }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add slide button */}
      <div className="p-2 border-t">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une slide
        </Button>
      </div>
    </div>
  );
}
