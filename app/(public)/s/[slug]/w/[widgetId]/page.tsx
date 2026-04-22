'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, Button } from '@/components/ui';
import { BookOpen, ArrowLeft, Pencil, Globe } from 'lucide-react';
import { getWidgetRenderers } from '@/components/widgets/registry';
import { PlayerProvider } from '@/components/widgets/player';
import { usePublicTranslations } from '@/lib/i18n/public-translations';
import type { WidgetData } from '@/components/widgets/types';

interface WidgetAccessData {
  widget: WidgetData;
  role: 'owner' | 'editor' | 'viewer';
  studio: {
    id: string;
    title: string;
    description?: string;
  };
}

export default function PublicWidgetPage() {
  const { slug, widgetId } = useParams<{ slug: string; widgetId: string }>();
  const router = useRouter();
  const { t, locale, toggleLocale } = usePublicTranslations();

  const { data, isLoading, error } = useQuery<WidgetAccessData>({
    queryKey: ['public-widget', slug, widgetId],
    queryFn: async () => {
      const res = await fetch(`/api/public/s/${slug}/w/${widgetId}`);
      if (!res.ok) throw new Error('Widget not found');
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
          <h2 className="text-xl font-bold mb-2">{t.widgetNotFound}</h2>
          <p className="text-muted-foreground text-sm">
            {t.widgetNotFoundDesc}
          </p>
        </Card>
      </div>
    );
  }

  const { widget, role, studio } = data;
  const renderers = getWidgetRenderers(widget.type);
  // Prefer Player if available, otherwise fall back to Display
  const WidgetComponent = renderers.Player ?? renderers.Display;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/s/${slug}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.back}
            </Button>
            <div>
              <h1 className="font-semibold">{widget.title}</h1>
              <p className="text-xs text-muted-foreground">{studio.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              className="text-xs gap-1"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === 'fr' ? 'EN' : 'FR'}
            </Button>
            {role === 'owner' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/studios/${widget.studioId}`)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {t.edit}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Widget display */}
      <main className="max-w-4xl mx-auto p-6">
        <Card className="p-6">
          {widget.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {widget.description}
            </p>
          )}
          <PlayerProvider
            role={role}
            widgetId={widget.id}
            studioId={widget.studioId}
          >
            <WidgetComponent data={widget.data} widget={widget} />
          </PlayerProvider>
        </Card>
      </main>
    </div>
  );
}
