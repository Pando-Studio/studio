import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

// ----- Types ---------------------------------------------------------------

export interface ConversationMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  mode?: 'ASK' | 'PLAN' | 'AGENT' | null;
  citations?: unknown;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title?: string | null;
  messages: ConversationMessage[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
}

// ----- Fetchers ------------------------------------------------------------

async function fetchConversations(studioId: string): Promise<Conversation[]> {
  const res = await fetch(`/api/studios/${studioId}/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  const data = await res.json();
  return data.conversations;
}

async function fetchConversation(studioId: string, conversationId: string): Promise<Conversation> {
  const res = await fetch(`/api/studios/${studioId}/conversations/${conversationId}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  const data = await res.json();
  return data.conversation;
}

// ----- Query hooks ---------------------------------------------------------

export function useStudioConversations(studioId: string) {
  return useQuery({
    queryKey: queryKeys.conversations.byStudio(studioId),
    queryFn: () => fetchConversations(studioId),
    enabled: !!studioId,
  });
}

export function useConversation(studioId: string, conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ''),
    queryFn: () => fetchConversation(studioId, conversationId!),
    enabled: !!studioId && !!conversationId,
  });
}

// ----- Mutations -----------------------------------------------------------

export function useCreateConversation(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data?: { title?: string }) => {
      const res = await fetch(`/api/studios/${studioId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {}),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byStudio(studioId) });
    },
  });
}

export function useRenameConversation(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }) => {
      const res = await fetch(`/api/studios/${studioId}/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to rename conversation');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byStudio(studioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(variables.conversationId) });
    },
  });
}

export function useDeleteConversation(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/studios/${studioId}/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete conversation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byStudio(studioId) });
    },
  });
}
