import { prisma } from '@/lib/db';

type ShareRole = 'OWNER' | 'EDITOR' | 'VIEWER';

interface ResolvedWidgetAccess {
  widget: {
    id: string;
    studioId: string;
    type: string;
    title: string;
    description: string | null;
    data: unknown;
    status: string;
    order: number;
    kind: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  role: 'owner' | 'editor' | 'viewer';
  studio: {
    id: string;
    title: string;
    description: string | null;
  };
}

/**
 * Resolve access to a specific widget within a public studio.
 * Used by both the API route and potentially the server page.
 */
export async function resolveWidgetAccess(
  slug: string,
  widgetId: string,
  userId?: string
): Promise<ResolvedWidgetAccess | { error: string; status: number }> {
  const studio = await prisma.studio.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      title: true,
      description: true,
      isPublic: true,
      userId: true,
    },
  });

  if (!studio || !studio.isPublic) {
    return { error: 'Studio not found', status: 404 };
  }

  const widget = await prisma.widget.findFirst({
    where: {
      id: widgetId,
      studioId: studio.id,
      status: 'READY',
    },
    select: {
      id: true,
      studioId: true,
      type: true,
      title: true,
      description: true,
      data: true,
      status: true,
      order: true,
      kind: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!widget) {
    return { error: 'Widget not found', status: 404 };
  }

  // Determine role
  let role: 'owner' | 'editor' | 'viewer' = 'viewer';

  if (userId) {
    if (studio.userId === userId) {
      role = 'owner';
    } else {
      const share = await prisma.studioShare.findUnique({
        where: {
          studioId_userId: {
            studioId: studio.id,
            userId,
          },
        },
        select: { role: true },
      });

      if (share) {
        const roleMap: Record<ShareRole, 'owner' | 'editor' | 'viewer'> = {
          OWNER: 'owner',
          EDITOR: 'editor',
          VIEWER: 'viewer',
        };
        role = roleMap[share.role as ShareRole] ?? 'viewer';
      }
    }
  }

  return {
    widget,
    role,
    studio: {
      id: studio.id,
      title: studio.title,
      description: studio.description,
    },
  };
}

export function isAccessError(
  result: ResolvedWidgetAccess | { error: string; status: number }
): result is { error: string; status: number } {
  return 'error' in result;
}
