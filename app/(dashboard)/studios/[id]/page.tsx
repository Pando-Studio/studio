'use client';

import { use } from 'react';
import {
  StudioProvider,
  StudioLayout,
  StudioHeader,
  SourcesPanel,
  ChatPanel,
  RightPanel,
} from '@/components/studio';

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

export default function StudioPage({ params }: StudioPageProps) {
  const { id } = use(params);

  return (
    <StudioProvider studioId={id}>
      <StudioLayout
        header={<StudioHeader />}
        sourcesPanel={<SourcesPanel />}
        chatPanel={<ChatPanel />}
        rightPanel={<RightPanel />}
      />
    </StudioProvider>
  );
}
