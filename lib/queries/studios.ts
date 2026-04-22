import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

// ----- Types ---------------------------------------------------------------

export interface StudioSourceTag {
  id: string;
  tag: { id: string; name: string; color: string };
}

export interface StudioSource {
  id: string;
  title: string;
  type: 'DOCUMENT' | 'WEB' | 'YOUTUBE' | 'WIDGET' | 'AUDIO' | 'VIDEO';
  status: 'PENDING' | 'INDEXING' | 'INDEXED' | 'ERROR';
  metadata?: Record<string, unknown>;
  _count?: { chunks: number };
  tags?: StudioSourceTag[];
  createdAt: string;
}

export interface Widget {
  id: string;
  title: string;
  type: string;
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  kind: 'LEAF' | 'COMPOSED';
  data?: Record<string, unknown>;
  parentId?: string;
  slotId?: string;
  composition?: Record<string, unknown>;
  orchestration?: Record<string, unknown>;
  children?: Widget[];
  createdAt: string;
}

export interface Studio {
  id: string;
  title: string;
  description?: string;
  settings?: Record<string, unknown>;
  sources: StudioSource[];
  widgets: Widget[];
  conversations: { id: string; title?: string; mode: string; createdAt: string; updatedAt: string }[];
  _count: {
    sources: number;
    widgets: number;
    presentations: number;
    conversations: number;
  };
}

// ----- Fetchers ------------------------------------------------------------

async function fetchStudios(): Promise<Studio[]> {
  const res = await fetch('/api/studios');
  if (!res.ok) throw new Error('Failed to fetch studios');
  const data = await res.json();
  return data.studios;
}

async function fetchStudio(id: string): Promise<Studio> {
  const res = await fetch(`/api/studios/${id}`);
  if (!res.ok) throw new Error('Failed to fetch studio');
  const data = await res.json();
  return data.studio;
}

// ----- Query hooks ---------------------------------------------------------

export function useStudios() {
  return useQuery({
    queryKey: queryKeys.studios.list(),
    queryFn: fetchStudios,
  });
}

export function useStudio(id: string) {
  return useQuery({
    queryKey: queryKeys.studios.detail(id),
    queryFn: () => fetchStudio(id),
    enabled: !!id,
    // No polling — real-time updates via SSE (useStudioEvents)
  });
}

// ----- Mutation hooks ------------------------------------------------------

export function useCreateStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const res = await fetch('/api/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create studio');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studios.all });
    },
  });
}

export function useUpdateStudio(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title?: string; description?: string; settings?: Record<string, unknown> }) => {
      const res = await fetch(`/api/studios/${studioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update studio');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studios.detail(studioId) });
    },
  });
}

export function useDeleteStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studioId: string) => {
      const res = await fetch(`/api/studios/${studioId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete studio');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studios.all });
    },
  });
}
