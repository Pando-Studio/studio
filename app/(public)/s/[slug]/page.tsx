'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  StudioProvider,
  StudioLayout,
  StudioHeader,
  SourcesPanel,
  ChatPanel,
  RightPanel,
} from '@/components/studio';

interface PublicStudioData {
  studio: { id: string; title: string };
}

export default function PublicStudioPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<PublicStudioData>({
    queryKey: ['public-studio-resolve', slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/s/${slug}`);
      if (!res.ok) throw new Error('Studio not found');
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.studio?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Studio not found</h1>
          <p className="text-muted-foreground">
            This studio is not available or has been made private.
          </p>
          <a href="/" className="text-primary hover:underline text-sm">
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <StudioProvider studioId={data.studio.id}>
      <StudioLayout
        header={<StudioHeader />}
        sourcesPanel={<SourcesPanel />}
        chatPanel={<ChatPanel />}
        rightPanel={<RightPanel />}
      />
    </StudioProvider>
  );
}
