import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

// ----- Types ---------------------------------------------------------------

export interface UserFavorite {
  id: string;
  widgetId?: string;
  coursePlanId?: string;
  createdAt: string;
  widget?: {
    id: string;
    title: string;
    type: string;
    status: string;
    kind: string;
    studioId: string;
    studio: { title: string };
  };
  coursePlan?: {
    id: string;
    title: string;
    status: string;
    studioId: string;
    studio: { title: string };
  };
}

// ----- Fetchers ------------------------------------------------------------

async function fetchFavorites(): Promise<UserFavorite[]> {
  const res = await fetch('/api/favorites');
  if (!res.ok) throw new Error('Failed to fetch favorites');
  const data = await res.json();
  return data.favorites;
}

// ----- Query hooks ---------------------------------------------------------

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: fetchFavorites,
  });
}

// ----- Mutations -----------------------------------------------------------

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      widgetId,
      coursePlanId,
      isFavorite,
    }: {
      widgetId?: string;
      coursePlanId?: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        const res = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgetId, coursePlanId }),
        });
        if (!res.ok) throw new Error('Failed to remove favorite');
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgetId, coursePlanId }),
        });
        if (!res.ok) throw new Error('Failed to add favorite');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
    },
  });
}
