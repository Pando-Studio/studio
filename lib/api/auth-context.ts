import { headers } from 'next/headers';
import { prisma, type Studio, type Presentation } from '@/lib/db';
import { auth } from '@/lib/auth';

export type AuthContext = {
  userId: string;
};

export type RoleAuthContext = AuthContext & {
  role: string;
};

export type StudioAuthContext = AuthContext & {
  studio: Studio;
};

export type StudioAccessContext = AuthContext & {
  studio: Studio;
  effectiveRole: 'owner' | 'editor' | 'viewer';
};

export type PresentationAuthContext = AuthContext & {
  presentation: Presentation;
};

export type AuthError = {
  error: string;
  status: number;
};

// Role hierarchy for platform-level roles (admin > creator > viewer)
// "user" (DB default) is treated as "viewer" in permissions
const PLATFORM_ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  user: 0, // "user" default = same as viewer
  creator: 1,
  admin: 2,
};

// Role hierarchy for studio-level access (owner > editor > viewer)
const STUDIO_ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

/**
 * Resolve the current authenticated user identity.
 * Returns AuthError if not authenticated or not active.
 */
export async function getAuthContext(): Promise<AuthContext | AuthError> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user?.id;

  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Check user status (admins always pass)
  const user = session.user as Record<string, unknown>;
  if (user.role !== 'admin' && user.status !== 'active') {
    // Fallback: check DB in case session data is stale
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, role: true },
    });

    if (!dbUser) {
      return { error: 'Unauthorized', status: 401 };
    }

    if (dbUser.role !== 'admin' && dbUser.status !== 'active') {
      return { error: 'Account pending approval', status: 403 };
    }
  }

  return { userId };
}

/**
 * Resolve the current authenticated user identity (strict auth only).
 * Returns AuthError if not authenticated.
 */
export async function getUserAuthContext(): Promise<{ userId: string } | AuthError> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user?.id;

  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { userId };
}

/**
 * Resolve the current user identity and verify studio ownership.
 * Returns AuthError if not authenticated or not the studio owner.
 */
export async function getStudioAuthContext(
  studioId: string,
): Promise<StudioAuthContext | AuthError> {
  const authResult = await getAuthContext();
  if ('error' in authResult) return authResult;

  const { userId } = authResult;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
  });

  if (!studio) {
    return { error: 'Studio not found', status: 404 };
  }

  const isOwner = studio.userId === userId;

  if (!isOwner) {
    return { error: 'Unauthorized', status: 403 };
  }

  return { studio, userId };
}

/**
 * Resolve the current user identity and verify presentation ownership.
 * Fetches the presentation with its studio, checks studio.userId === session.userId.
 * Returns AuthError if not authenticated or not the presentation owner.
 */
export async function getPresentationAuthContext(
  presentationId: string,
): Promise<PresentationAuthContext | AuthError> {
  const authResult = await getAuthContext();
  if ('error' in authResult) return authResult;

  const { userId } = authResult;

  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId },
    include: { studio: { select: { userId: true } } },
  });

  if (!presentation) {
    return { error: 'Presentation not found', status: 404 };
  }

  if (presentation.studio.userId !== userId) {
    return { error: 'Forbidden', status: 403 };
  }

  return { presentation, userId };
}

/**
 * Verify the current user has at least the specified platform role.
 * Role hierarchy: admin > creator > viewer (= user default).
 */
export async function requireRole(
  minimumRole: 'viewer' | 'creator' | 'admin',
): Promise<RoleAuthContext | AuthError> {
  const authResult = await getAuthContext();
  if ('error' in authResult) return authResult;

  const { userId } = authResult;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true },
  });

  if (!dbUser) {
    return { error: 'User not found', status: 401 };
  }

  if (dbUser.banned) {
    return { error: 'Account is banned', status: 403 };
  }

  const userLevel = PLATFORM_ROLE_HIERARCHY[dbUser.role] ?? 0;
  const requiredLevel = PLATFORM_ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    return {
      error: `Insufficient permissions: requires '${minimumRole}' role`,
      status: 403,
    };
  }

  return { userId, role: dbUser.role };
}

/**
 * Verify the current user has access to a specific studio.
 * Checks ownership first, then StudioShare records.
 * Admins always get owner-level access.
 */
export async function requireStudioAccess(
  studioId: string,
  minimumRole?: 'viewer' | 'editor' | 'owner',
): Promise<StudioAccessContext | AuthError> {
  const authResult = await getAuthContext();
  if ('error' in authResult) return authResult;

  const { userId } = authResult;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
  });

  if (!studio) {
    return { error: 'Studio not found', status: 404 };
  }

  // Check if user is platform admin (always gets owner access)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  let effectiveRole: 'owner' | 'editor' | 'viewer';

  if (dbUser?.role === 'admin' || studio.userId === userId) {
    effectiveRole = 'owner';
  } else {
    // Check StudioShare
    const share = await prisma.studioShare.findUnique({
      where: { studioId_userId: { studioId, userId } },
      select: { role: true },
    });

    if (!share) {
      // Check if studio is public (grants viewer access)
      if (studio.isPublic) {
        effectiveRole = 'viewer';
      } else {
        return { error: 'Access denied to this studio', status: 403 };
      }
    } else {
      // Map ShareRole (EDITOR/VIEWER) to effectiveRole
      effectiveRole = share.role === 'EDITOR' ? 'editor' : 'viewer';
    }
  }

  if (minimumRole) {
    const userLevel = STUDIO_ROLE_HIERARCHY[effectiveRole] ?? 0;
    const requiredLevel = STUDIO_ROLE_HIERARCHY[minimumRole] ?? 0;

    if (userLevel < requiredLevel) {
      return {
        error: `Insufficient studio permissions: requires '${minimumRole}' access`,
        status: 403,
      };
    }
  }

  return { userId, studio, effectiveRole };
}

/**
 * Get studio access for potentially unauthenticated users.
 * For public studios, returns viewer role even without auth.
 * For private studios, falls back to requireStudioAccess.
 */
export async function getPublicStudioAccess(
  studioId: string,
): Promise<StudioAccessContext | AuthError> {
  // Try authenticated access first
  const authResult = await getAuthContext();
  if (!('error' in authResult)) {
    return requireStudioAccess(studioId);
  }

  // No auth — check if studio is public
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
  });

  if (!studio) {
    return { error: 'Studio not found', status: 404 };
  }

  if (!studio.isPublic) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Public studio, anonymous viewer
  return { userId: 'anonymous', studio, effectiveRole: 'viewer' };
}

/** Type guard to check if result is an error */
export function isAuthError(result: unknown): result is AuthError {
  return typeof result === 'object' && result !== null && 'error' in result && 'status' in result;
}
