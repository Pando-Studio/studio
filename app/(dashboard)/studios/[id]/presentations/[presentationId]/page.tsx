'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import {
  ChevronLeft,
  Settings,
  Eye,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { PresentationEditor } from '@/components/presentation/PresentationEditor';

interface Presentation {
  id: string;
  title: string;
  studioId: string;
  studioTitle: string;
  status: string;
  version: number;
  slides: Array<{
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
  }>;
}

export default function PresentationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;
  const presentationId = params.presentationId as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPresentation() {
      try {
        const response = await fetch(`/api/presentations/${presentationId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Presentation non trouvee');
          }
          throw new Error('Erreur lors du chargement');
        }

        const data = await response.json();
        setPresentation(data.presentation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPresentation();
  }, [presentationId]);

  const handleSlideUpdate = async (slideId: string, content: object) => {
    if (!presentation) return;

    try {
      const response = await fetch(
        `/api/presentations/${presentationId}/slides/${slideId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update slide');
      }

      // Update local state
      setPresentation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slides: prev.slides.map((slide) =>
            slide.id === slideId ? { ...slide, content: content as typeof slide.content } : slide
          ),
        };
      });
    } catch (err) {
      console.error('Error updating slide:', err);
    }
  };

  const handleSlidesReorder = async (newOrder: string[]) => {
    if (!presentation) return;

    try {
      const response = await fetch(
        `/api/presentations/${presentationId}/slides/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slideIds: newOrder }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reorder slides');
      }

      // Update local state
      const reorderedSlides = newOrder.map((id, index) => {
        const slide = presentation.slides.find((s) => s.id === id);
        return slide ? { ...slide, order: index } : null;
      }).filter(Boolean) as typeof presentation.slides;

      setPresentation((prev) => prev ? { ...prev, slides: reorderedSlides } : prev);
    } catch (err) {
      console.error('Error reordering slides:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error || 'Presentation non trouvee'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with breadcrumb */}
      <header className="border-b bg-background">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link
              href={`/studios/${studioId}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Studio
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{presentation.studioTitle}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{presentation.title}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Parametres
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Previsualiser
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <PresentationEditor
          presentation={presentation}
          onSlideUpdate={handleSlideUpdate}
          onSlidesReorder={handleSlidesReorder}
        />
      </div>
    </div>
  );
}
