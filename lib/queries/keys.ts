// ---------------------------------------------------------------------------
// TanStack Query — centralized query key factory for Studio
// ---------------------------------------------------------------------------

export const queryKeys = {
  studios: {
    all: ['studios'] as const,
    list: () => [...queryKeys.studios.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.studios.all, 'detail', id] as const,
  },

  sources: {
    all: ['sources'] as const,
    byStudio: (studioId: string) =>
      [...queryKeys.sources.all, 'studio', studioId] as const,
    chunks: (sourceId: string) =>
      [...queryKeys.sources.all, 'chunks', sourceId] as const,
  },

  widgets: {
    all: ['widgets'] as const,
    byStudio: (studioId: string) =>
      [...queryKeys.widgets.all, 'studio', studioId] as const,
    detail: (id: string) =>
      [...queryKeys.widgets.all, 'detail', id] as const,
  },

  runs: {
    all: ['runs'] as const,
    byStudio: (studioId: string) =>
      [...queryKeys.runs.all, 'studio', studioId] as const,
    detail: (runId: string) =>
      [...queryKeys.runs.all, 'detail', runId] as const,
  },

  conversations: {
    all: ['conversations'] as const,
    byStudio: (studioId: string) =>
      [...queryKeys.conversations.all, 'studio', studioId] as const,
    detail: (conversationId: string) =>
      [...queryKeys.conversations.all, 'detail', conversationId] as const,
  },

  coursePlans: {
    all: ['coursePlans'] as const,
    byStudio: (studioId: string) =>
      [...queryKeys.coursePlans.all, 'studio', studioId] as const,
  },

  favorites: {
    all: ['favorites'] as const,
  },

  providers: {
    all: ['providers'] as const,
  },

  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
  },

  sourceSearch: {
    all: ['source-search'] as const,
    byStudio: (studioId: string, query: string) =>
      [...queryKeys.sourceSearch.all, studioId, query] as const,
  },

  deepResearch: {
    all: ['deep-research'] as const,
    byStudio: (studioId: string) =>
      [...queryKeys.deepResearch.all, 'studio', studioId] as const,
  },
} as const;
