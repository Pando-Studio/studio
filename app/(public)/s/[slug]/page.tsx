'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { ChevronLeft, ChevronRight, BookOpen, Globe } from 'lucide-react';
import { getWidgetRenderers } from '@/components/widgets/registry';
import { usePublicTranslations } from '@/lib/i18n/public-translations';
import type { WidgetData } from '@/components/widgets/types';

interface PublicStudioData {
  studio: {
    id: string;
    title: string;
    description?: string;
  };
  widgets: WidgetData[];
}

export default function PublicPlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t, locale, toggleLocale } = usePublicTranslations();

  const { data, isLoading, error } = useQuery<PublicStudioData>({
    queryKey: ['public-studio', slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/s/${slug}`);
      if (!res.ok) throw new Error('Studio not found');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">{t.studioNotFound}</h2>
          <p className="text-muted-foreground text-sm">
            {t.studioNotFoundDesc}
          </p>
        </Card>
      </div>
    );
  }

  const { studio, widgets } = data;
  const currentWidget = widgets[currentIndex];
  const total = widgets.length;

  if (!currentWidget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold">{studio.title}</h2>
          <p className="text-muted-foreground mt-2">{t.noWidgetsDesc}</p>
        </Card>
      </div>
    );
  }

  const { Display } = getWidgetRenderers(currentWidget.type);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{studio.title}</h1>
            {studio.description && (
              <p className="text-xs text-muted-foreground">{studio.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} / {total}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              className="text-xs gap-1"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === 'fr' ? 'EN' : 'FR'}
            </Button>
          </div>
        </div>
      </header>

      {/* Widget display */}
      <main className="max-w-4xl mx-auto p-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{currentWidget.title}</h2>
          <Display data={currentWidget.data} widget={currentWidget} />
        </Card>
      </main>

      {/* Navigation */}
      {total > 1 && (
        <footer className="fixed bottom-0 left-0 right-0 border-t bg-card px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t.previous}
            </Button>
            <div className="flex gap-1">
              {widgets.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
              disabled={currentIndex === total - 1}
            >
              {t.next}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
