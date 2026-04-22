'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { StudioSource, Widget, Conversation } from '@/lib/queries';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MentionCategory = 'Source' | 'Widget' | 'Conversation';

export interface MentionItem {
  id: string;
  title: string;
  category: MentionCategory;
  /** Optional subtitle (e.g. widget type, source type) */
  subtitle?: string;
}

export interface MentionState {
  /** Whether the mention dropdown is visible */
  isOpen: boolean;
  /** Text after the `@` used for filtering */
  query: string;
  /** Position of the `@` in the textarea value */
  atIndex: number;
  /** Filtered mention items */
  items: MentionItem[];
  /** Currently highlighted index in the dropdown */
  highlightIndex: number;
}

interface UseMentionsOptions {
  sources: StudioSource[];
  widgets: Widget[];
  conversations: Conversation[];
}

interface UseMentionsReturn {
  state: MentionState;
  /** Call on every textarea change to detect @mentions */
  handleInputChange: (value: string, cursorPosition: number) => void;
  /** Call on keydown to handle arrow keys / enter / escape */
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Select a mention item — returns the new text value */
  selectMention: (item: MentionItem, currentValue: string) => string;
  /** Close the dropdown */
  close: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const INITIAL_STATE: MentionState = {
  isOpen: false,
  query: '',
  atIndex: -1,
  items: [],
  highlightIndex: 0,
};

export function useMentions({ sources, widgets, conversations }: UseMentionsOptions): UseMentionsReturn {
  const [state, setState] = useState<MentionState>(INITIAL_STATE);
  const allItemsRef = useRef<MentionItem[]>([]);

  // Build the full list of mentionable items
  const allItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];

    for (const s of sources) {
      if (s.status === 'INDEXED') {
        items.push({
          id: s.id,
          title: s.title,
          category: 'Source',
          subtitle: s.type,
        });
      }
    }

    for (const w of widgets) {
      items.push({
        id: w.id,
        title: w.title,
        category: 'Widget',
        subtitle: w.type,
      });
    }

    for (const c of conversations) {
      items.push({
        id: c.id,
        title: c.title ?? 'Sans titre',
        category: 'Conversation',
      });
    }

    return items;
  }, [sources, widgets, conversations]);

  // Keep ref in sync for use in callbacks
  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  const filterItems = useCallback((query: string): MentionItem[] => {
    if (!query) return allItemsRef.current.slice(0, 10);
    const lower = query.toLowerCase();
    return allItemsRef.current
      .filter((item) =>
        item.title.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        (item.subtitle?.toLowerCase().includes(lower) ?? false)
      )
      .slice(0, 10);
  }, []);

  const handleInputChange = useCallback((value: string, cursorPosition: number) => {
    // Find the last `@` before the cursor that isn't inside a completed mention
    const textBeforeCursor = value.substring(0, cursorPosition);

    // Check if we're inside a completed mention pattern @[...](...)
    const completedMentionRegex = /@\[[^\]]*\]\([^)]*\)/g;
    let lastCompletedEnd = 0;
    let match;
    while ((match = completedMentionRegex.exec(textBeforeCursor)) !== null) {
      const end = match.index + match[0].length;
      if (end > lastCompletedEnd) lastCompletedEnd = end;
    }

    const searchArea = textBeforeCursor.substring(lastCompletedEnd);
    const atIndex = searchArea.lastIndexOf('@');

    if (atIndex === -1) {
      setState(INITIAL_STATE);
      return;
    }

    const absoluteAtIndex = lastCompletedEnd + atIndex;

    // Check that `@` is at start of input or preceded by whitespace
    if (absoluteAtIndex > 0 && !/\s/.test(value[absoluteAtIndex - 1])) {
      setState(INITIAL_STATE);
      return;
    }

    const query = searchArea.substring(atIndex + 1);

    // Don't show dropdown if query has a newline (user moved on)
    if (query.includes('\n')) {
      setState(INITIAL_STATE);
      return;
    }

    const filtered = filterItems(query);

    setState({
      isOpen: true,
      query,
      atIndex: absoluteAtIndex,
      items: filtered,
      highlightIndex: 0,
    });
  }, [filterItems]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!state.isOpen) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          highlightIndex: Math.min(prev.highlightIndex + 1, prev.items.length - 1),
        }));
        return true;

      case 'ArrowUp':
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          highlightIndex: Math.max(prev.highlightIndex - 1, 0),
        }));
        return true;

      case 'Enter':
      case 'Tab':
        if (state.items.length > 0) {
          e.preventDefault();
          // The actual selection is handled by the component calling selectMention
          return true;
        }
        return false;

      case 'Escape':
        e.preventDefault();
        setState(INITIAL_STATE);
        return true;

      default:
        return false;
    }
  }, [state.isOpen, state.items.length]);

  const selectMention = useCallback((item: MentionItem, currentValue: string): string => {
    const { atIndex, query } = state;
    const mentionText = `@[${item.category}: ${item.title}](${item.id}) `;
    const before = currentValue.substring(0, atIndex);
    const after = currentValue.substring(atIndex + 1 + query.length); // +1 for the @
    setState(INITIAL_STATE);
    return before + mentionText + after;
  }, [state]);

  const close = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    handleInputChange,
    handleKeyDown,
    selectMention,
    close,
  };
}
