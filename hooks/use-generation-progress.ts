import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/keys';

interface GenerationRunDetail {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorLog?: string;
  metadata?: {
    progress?: number;
    step?: string;
    label?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  completedAt?: string;
}

async function fetchRunDetail(studioId: string, runId: string): Promise<GenerationRunDetail> {
  const res = await fetch(`/api/studios/${studioId}/generations/${runId}`);
  if (!res.ok) throw new Error('Failed to fetch generation run');
  const data = await res.json();
  return data.run;
}

/**
 * Polls a single generation run for progress updates.
 * Polls every 1s while enabled, stops when disabled.
 */
export function useGenerationProgress(studioId: string, runId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.runs.detail(runId),
    queryFn: () => fetchRunDetail(studioId, runId),
    enabled,
    refetchInterval: enabled ? 1000 : false,
  });
}
