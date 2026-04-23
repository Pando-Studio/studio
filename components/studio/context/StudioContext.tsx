'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {
  useStudio as useStudioQuery,
  useUpdateStudio as useUpdateStudioMutation,
  useStudioRuns,
  useStudioCoursePlans,
  useFavorites,
  useToggleFavorite,
  queryKeys,
} from '@/lib/queries';
import type {
  Studio,
  StudioSource,
  Widget,
  GenerationRun,
  CoursePlan,
  UserFavorite,
  Conversation,
} from '@/lib/queries';
import { useStudioUI } from '@/lib/stores/studio-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEvents } from '@/hooks/use-studio-events';

// Re-export types for backward compatibility
export type {
  Studio,
  StudioSource,
  Widget,
  GenerationRun,
  CoursePlan,
  UserFavorite,
  Conversation,
};
export type { ConversationMessage } from '@/lib/queries';

interface StudioContextValue {
  // Data
  studio: Studio | null;
  isLoading: boolean;
  error: string | null;

  // Role-based access
  role: 'owner' | 'editor' | 'viewer';
  canEdit: boolean;
  isViewer: boolean;

  // Sources
  sources: StudioSource[];
  selectedSourceIds: Set<string>;
  setSelectedSourceIds: (ids: Set<string>) => void;
  toggleSourceSelection: (id: string) => void;
  selectAllSources: () => void;
  deselectAllSources: () => void;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | undefined;
  setActiveConversationId: (id: string | undefined) => void;
  createConversation: () => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<void>;

  // Widgets
  widgets: Widget[];
  rootWidgets: Widget[];
  getWidgetChildren: (parentId: string, slotId?: string) => Widget[];

  // Course Plans
  coursePlans: CoursePlan[];

  // Favorites
  favorites: UserFavorite[];
  isFavorite: (widgetId?: string, coursePlanId?: string) => boolean;
  toggleFavorite: (widgetId?: string, coursePlanId?: string) => Promise<void>;

  // Runs
  runs: GenerationRun[];

  // UI State
  isSourcesPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  toggleSourcesPanel: () => void;
  toggleRightPanel: () => void;
  setSourcesPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;

  // Actions
  refreshStudio: () => Promise<void>;
  updateStudioTitle: (title: string) => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

interface StudioProviderProps {
  studioId: string;
  children: ReactNode;
}

export function StudioProvider({ studioId, children }: StudioProviderProps) {
  const queryClient = useQueryClient();

  // --- TanStack Query data ---
  const studioQuery = useStudioQuery(studioId);
  const runsQuery = useStudioRuns(studioId);

  const studio = studioQuery.data ?? null;

  // SSE: receive real-time events from workers via Redis pub/sub
  // Disabled for viewers (SSE endpoint requires auth, causes retry loop for anonymous users)
  useStudioEvents({ studioId, onEvent: () => {}, enabled: studio?.role !== 'viewer' });
  const coursePlansQuery = useStudioCoursePlans(studioId);
  const favoritesQuery = useFavorites();
  const updateStudioMut = useUpdateStudioMutation(studioId);
  const toggleFavoriteMut = useToggleFavorite();
  const runs = runsQuery.data ?? [];
  const coursePlans = coursePlansQuery.data ?? [];
  const favorites = favoritesQuery.data ?? [];

  // --- Zustand UI state ---
  const uiStore = useStudioUI();

  // Auto-refresh widgets when a generation run completes
  const WIDGET_RUN_TYPES = useMemo(
    () => new Set(['QUIZ', 'WORDCLOUD', 'ROLEPLAY', 'MULTIPLE_CHOICE', 'POSTIT', 'RANKING', 'OPENTEXT']),
    [],
  );

  useEffect(() => {
    const hasCompleted = runs.some(
      (r) => WIDGET_RUN_TYPES.has(r.type) && (r.status === 'COMPLETED' || r.status === 'FAILED'),
    );
    if (hasCompleted) {
      queryClient.invalidateQueries({ queryKey: queryKeys.studios.detail(studioId) });
    }
  }, [runs, studioId, queryClient, WIDGET_RUN_TYPES]);

  // Auto-select all sources on first load
  useEffect(() => {
    if (studio?.sources && uiStore.selectedSourceIds.size === 0) {
      uiStore.selectAllSources(studio.sources.map((s) => s.id));
    }
    // Only run on first studio load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio?.id]);

  // --- Derived data ---
  const allWidgets = studio?.widgets ?? [];
  const rootWidgets = useMemo(() => allWidgets.filter((w) => !w.parentId), [allWidgets]);
  const getWidgetChildren = useCallback(
    (parentId: string, slotId?: string) =>
      allWidgets.filter((w) => w.parentId === parentId && (!slotId || w.slotId === slotId)),
    [allWidgets],
  );

  // --- Backward-compatible handlers ---
  const createConversation = useCallback(async (): Promise<Conversation | null> => {
    try {
      const res = await fetch(`/api/studios/${studioId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const conv = data.conversation as Conversation;
      uiStore.setActiveConversationId(conv.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byStudio(studioId) });
      return conv;
    } catch {
      return null;
    }
  }, [studioId, queryClient, uiStore]);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/studios/${studioId}/conversations/${id}`, { method: 'DELETE' });
        if (uiStore.activeConversationId === id) {
          uiStore.setActiveConversationId(undefined);
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byStudio(studioId) });
      } catch {
        // silently fail
      }
    },
    [studioId, queryClient, uiStore],
  );

  const isFavorite = useCallback(
    (widgetId?: string, coursePlanId?: string) =>
      favorites.some(
        (f) =>
          (widgetId && f.widgetId === widgetId) ||
          (coursePlanId && f.coursePlanId === coursePlanId),
      ),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (widgetId?: string, coursePlanId?: string) => {
      const alreadyFav = isFavorite(widgetId, coursePlanId);
      toggleFavoriteMut.mutate({ widgetId, coursePlanId, isFavorite: alreadyFav });
    },
    [isFavorite, toggleFavoriteMut],
  );

  const refreshStudio = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.studios.detail(studioId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.runs.byStudio(studioId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.coursePlans.byStudio(studioId) });
  }, [studioId, queryClient]);

  const updateStudioTitle = useCallback(
    async (title: string) => {
      await updateStudioMut.mutateAsync({ title });
    },
    [updateStudioMut],
  );

  const role = studio?.role ?? 'viewer';
  const canEdit = role === 'owner' || role === 'editor';
  const isViewer = role === 'viewer';

  const value: StudioContextValue = {
    studio,
    isLoading: studioQuery.isLoading,
    error: studioQuery.error?.message ?? null,

    role,
    canEdit,
    isViewer,

    sources: studio?.sources ?? [],
    selectedSourceIds: uiStore.selectedSourceIds,
    setSelectedSourceIds: uiStore.setSelectedSourceIds,
    toggleSourceSelection: uiStore.toggleSourceSelection,
    selectAllSources: () => {
      if (studio?.sources) uiStore.selectAllSources(studio.sources.map((s) => s.id));
    },
    deselectAllSources: uiStore.deselectAllSources,

    conversations: (studio?.conversations ?? []).map((c) => ({
      ...c,
      messages: [],
    })) as Conversation[],
    activeConversationId: uiStore.activeConversationId,
    setActiveConversationId: uiStore.setActiveConversationId,
    createConversation,
    deleteConversation,

    widgets: allWidgets,
    rootWidgets,
    getWidgetChildren,

    coursePlans,

    favorites,
    isFavorite,
    toggleFavorite,

    runs,

    isSourcesPanelCollapsed: uiStore.isSourcesPanelCollapsed,
    isRightPanelCollapsed: uiStore.isRightPanelCollapsed,
    toggleSourcesPanel: uiStore.toggleSourcesPanel,
    toggleRightPanel: uiStore.toggleRightPanel,
    setSourcesPanelCollapsed: uiStore.setSourcesPanelCollapsed,
    setRightPanelCollapsed: uiStore.setRightPanelCollapsed,

    refreshStudio,
    updateStudioTitle,
  };

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  );
}

export function useStudioContext() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}

// Backward-compatible alias
export const useStudio = useStudioContext;

// Individual hooks for specific state slices
export function useSources() {
  const {
    sources,
    selectedSourceIds,
    toggleSourceSelection,
    selectAllSources,
    deselectAllSources,
  } = useStudioContext();

  return {
    sources,
    selectedSourceIds,
    toggleSourceSelection,
    selectAllSources,
    deselectAllSources,
  };
}

export function useConversations() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
  } = useStudioContext();

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
  };
}

export function usePanels() {
  const {
    isSourcesPanelCollapsed,
    isRightPanelCollapsed,
    toggleSourcesPanel,
    toggleRightPanel,
    setSourcesPanelCollapsed,
    setRightPanelCollapsed,
  } = useStudioContext();

  return {
    isSourcesPanelCollapsed,
    isRightPanelCollapsed,
    toggleSourcesPanel,
    toggleRightPanel,
    setSourcesPanelCollapsed,
    setRightPanelCollapsed,
  };
}
