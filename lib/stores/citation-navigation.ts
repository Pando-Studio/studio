import { create } from 'zustand';

interface CitationNavigationState {
  highlightedSourceId: string | null;
  highlightedChunkId: string | null;
  highlightSource: (sourceId: string, chunkId?: string) => void;
  clearHighlight: () => void;
}

export const useCitationNavigation = create<CitationNavigationState>((set) => ({
  highlightedSourceId: null,
  highlightedChunkId: null,

  highlightSource: (sourceId, chunkId) =>
    set({ highlightedSourceId: sourceId, highlightedChunkId: chunkId ?? null }),

  clearHighlight: () =>
    set({ highlightedSourceId: null, highlightedChunkId: null }),
}));
