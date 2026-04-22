import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';

// ----- Types ---------------------------------------------------------------

export interface GenerationRunMetadata {
  progress?: number;
  step?: string;
  label?: string;
  [key: string]: unknown;
}

export interface GenerationRun {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorLog?: string;
  metadata?: GenerationRunMetadata;
  widgetId?: string;
  createdAt: string;
}

// ----- Fetchers ------------------------------------------------------------

async function fetchRuns(studioId: string): Promise<GenerationRun[]> {
  const res = await fetch(`/api/studios/${studioId}/generations`);
  if (!res.ok) throw new Error('Failed to fetch generation runs');
  const data = await res.json();
  return data.runs;
}

// ----- Query hooks ---------------------------------------------------------

export function useStudioRuns(studioId: string) {
  return useQuery({
    queryKey: queryKeys.runs.byStudio(studioId),
    queryFn: () => fetchRuns(studioId),
    enabled: !!studioId,
    // No polling — real-time updates via SSE (useStudioEvents)
  });
}
