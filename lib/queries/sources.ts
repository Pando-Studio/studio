import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import type { StudioSource } from './studios';

// ----- Fetchers ------------------------------------------------------------

async function fetchSources(studioId: string): Promise<StudioSource[]> {
  const res = await fetch(`/api/studios/${studioId}/sources`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  const data = await res.json();
  return data.sources;
}

// ----- Query hooks ---------------------------------------------------------

export function useStudioSources(studioId: string) {
  return useQuery({
    queryKey: queryKeys.sources.byStudio(studioId),
    queryFn: () => fetchSources(studioId),
    enabled: !!studioId,
    // No polling — real-time updates via SSE (useStudioEvents)
  });
}

// ----- Mutations -----------------------------------------------------------

export function useDeleteSource(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await fetch(`/api/documents/${sourceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete source');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.byStudio(studioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.studios.detail(studioId) });
    },
  });
}
