import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
  _count?: { sources: number };
}

const tagKeys = {
  all: ['tags'] as const,
  list: () => [...tagKeys.all, 'list'] as const,
};

export function useTags() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: async (): Promise<DocumentTag[]> => {
      const res = await fetch('/api/library/tags');
      if (!res.ok) return [];
      const data: { tags: DocumentTag[] } = await res.json();
      return data.tags;
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string }): Promise<DocumentTag> => {
      const res = await fetch('/api/library/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la creation du tag');
      }
      const result: { tag: DocumentTag } = await res.json();
      return result.tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la creation du tag');
    },
  });
}

export function useTagSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, tagId }: { sourceId: string; tagId: string }) => {
      const res = await fetch(`/api/documents/${sourceId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) {
        const err: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'ajout du tag');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout du tag');
    },
  });
}

export function useUntagSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, tagId }: { sourceId: string; tagId: string }) => {
      const res = await fetch(`/api/documents/${sourceId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression du tag');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du tag');
    },
  });
}
