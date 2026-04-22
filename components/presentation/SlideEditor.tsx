'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

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
  notes?: string;
}

interface SlideEditorProps {
  slide: Slide;
  onContentChange: (html: string) => void;
}

export function SlideEditor({ slide, onContentChange }: SlideEditorProps) {
  const [html, setHtml] = useState(slide.content.html);
  const debouncedHtml = useDebounce(html, 500);

  // Update local state when slide changes
  useEffect(() => {
    setHtml(slide.content.html);
  }, [slide.id, slide.content.html]);

  // Save changes with debounce
  useEffect(() => {
    if (debouncedHtml !== slide.content.html) {
      onContentChange(debouncedHtml);
    }
  }, [debouncedHtml, slide.content.html, onContentChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtml(e.target.value);
  }, []);

  if (slide.content.isInteractive) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            Cette slide contient un widget interactif.
          </p>
          <p className="text-sm text-muted-foreground">
            Type: <span className="font-medium">{slide.content.type}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor header */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <p className="text-sm font-medium">HTML</p>
      </div>

      {/* Code editor */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={html}
          onChange={handleChange}
          className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none"
          spellCheck={false}
          placeholder="<div>Contenu de la slide...</div>"
        />
      </div>
    </div>
  );
}
