import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/keys';

interface SourceChunk {
  id: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown> | null;
  pageNumber: number | null;
  createdAt: string;
}

interface SourceChunksResponse {
  chunks: SourceChunk[];
  total: number;
  offset: number;
  limit: number;
}

interface UseSourceChunksOptions {
  search?: string;
  offset?: number;
  limit?: number;
}

export type { SourceChunk, SourceChunksResponse };

export function useSourceChunks(
  studioId: string,
  sourceId: string | null,
  options?: UseSourceChunksOptions,
) {
  return useQuery<SourceChunksResponse>({
    queryKey: [
      ...queryKeys.sources.chunks(sourceId ?? ''),
      options?.search,
      options?.offset,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.search) params.set('search', options.search);
      if (options?.offset) params.set('offset', String(options.offset));
      if (options?.limit) params.set('limit', String(options.limit));

      const res = await fetch(
        `/api/studios/${studioId}/sources/${sourceId}/chunks?${params}`,
      );
      if (!res.ok) throw new Error('Failed to fetch chunks');
      return res.json() as Promise<SourceChunksResponse>;
    },
    enabled: !!studioId && !!sourceId,
  });
}
