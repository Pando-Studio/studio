import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';

// ----- Types ---------------------------------------------------------------

export interface CoursePlan {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ----- Fetchers ------------------------------------------------------------

async function fetchCoursePlans(studioId: string): Promise<CoursePlan[]> {
  const res = await fetch(`/api/studios/${studioId}/course-plans`);
  if (!res.ok) throw new Error('Failed to fetch course plans');
  const data = await res.json();
  return data.coursePlans;
}

// ----- Query hooks ---------------------------------------------------------

export function useStudioCoursePlans(studioId: string) {
  return useQuery({
    queryKey: queryKeys.coursePlans.byStudio(studioId),
    queryFn: () => fetchCoursePlans(studioId),
    enabled: !!studioId,
  });
}
