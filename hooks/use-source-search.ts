import { useQuery } from '@tanstack/react-query';

export interface SourceSearchMatch {
  chunkId: string;
  snippet: string;
}

export interface SourceSearchResult {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  matches: SourceSearchMatch[];
}

export function useSourceSearch(studioId: string, query: string) {
  return useQuery({
    queryKey: ['source-search', studioId, query],
    queryFn: async (): Promise<SourceSearchResult[]> => {
      const res = await fetch(
        `/api/studios/${studioId}/sources/search?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) return [];
      const data: { results: SourceSearchResult[] } = await res.json();
      return data.results;
    },
    enabled: !!studioId && query.length >= 2,
  });
}
