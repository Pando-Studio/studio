import { create } from 'zustand';

interface StudioUIState {
  // Panel visibility
  isSourcesPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;

  // Source selection
  selectedSourceIds: Set<string>;

  // Active conversation
  activeConversationId: string | undefined;

  // Actions
  toggleSourcesPanel: () => void;
  toggleRightPanel: () => void;
  setSourcesPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setSelectedSourceIds: (ids: Set<string>) => void;
  toggleSourceSelection: (id: string) => void;
  selectAllSources: (allIds: string[]) => void;
  deselectAllSources: () => void;
  setActiveConversationId: (id: string | undefined) => void;
}

export const useStudioUI = create<StudioUIState>((set) => ({
  isSourcesPanelCollapsed: false,
  isRightPanelCollapsed: false,
  selectedSourceIds: new Set<string>(),
  activeConversationId: undefined,

  toggleSourcesPanel: () =>
    set((s) => ({ isSourcesPanelCollapsed: !s.isSourcesPanelCollapsed })),

  toggleRightPanel: () =>
    set((s) => ({ isRightPanelCollapsed: !s.isRightPanelCollapsed })),

  setSourcesPanelCollapsed: (collapsed) =>
    set({ isSourcesPanelCollapsed: collapsed }),

  setRightPanelCollapsed: (collapsed) =>
    set({ isRightPanelCollapsed: collapsed }),

  setSelectedSourceIds: (ids) =>
    set({ selectedSourceIds: ids }),

  toggleSourceSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedSourceIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedSourceIds: next };
    }),

  selectAllSources: (allIds) =>
    set({ selectedSourceIds: new Set(allIds) }),

  deselectAllSources: () =>
    set({ selectedSourceIds: new Set() }),

  setActiveConversationId: (id) =>
    set({ activeConversationId: id }),
}));
