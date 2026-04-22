import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import type { Widget } from './studios';

// ----- Fetchers ------------------------------------------------------------

async function fetchWidgets(studioId: string): Promise<Widget[]> {
  const res = await fetch(`/api/studios/${studioId}/widgets`);
  if (!res.ok) throw new Error('Failed to fetch widgets');
  const data = await res.json();
  return data.widgets;
}

async function fetchWidget(studioId: string, widgetId: string): Promise<Widget> {
  const res = await fetch(`/api/studios/${studioId}/widgets/${widgetId}`);
  if (!res.ok) throw new Error('Failed to fetch widget');
  const data = await res.json();
  return data.widget;
}

// ----- Query hooks ---------------------------------------------------------

export function useStudioWidgets(studioId: string) {
  return useQuery({
    queryKey: queryKeys.widgets.byStudio(studioId),
    queryFn: () => fetchWidgets(studioId),
    enabled: !!studioId,
  });
}

export function useWidget(studioId: string, widgetId: string) {
  return useQuery({
    queryKey: queryKeys.widgets.detail(widgetId),
    queryFn: () => fetchWidget(studioId, widgetId),
    enabled: !!studioId && !!widgetId,
  });
}

// ----- Mutations -----------------------------------------------------------

export function useCreateWidget(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { type: string; title: string; data?: Record<string, unknown>; kind?: string }) => {
      const res = await fetch(`/api/studios/${studioId}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create widget');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.widgets.byStudio(studioId) });
    },
  });
}

export function useUpdateWidget(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ widgetId, ...data }: { widgetId: string; title?: string; data?: Record<string, unknown>; status?: string }) => {
      const res = await fetch(`/api/studios/${studioId}/widgets/${widgetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update widget');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.widgets.byStudio(studioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.widgets.detail(variables.widgetId) });
    },
  });
}

export function useDeleteWidget(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      const res = await fetch(`/api/studios/${studioId}/widgets/${widgetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete widget');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.widgets.byStudio(studioId) });
    },
  });
}
