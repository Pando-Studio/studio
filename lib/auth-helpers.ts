/**
 * Auth Helpers
 *
 * Utilities for authentication in API routes and server components.
 */

import { headers } from 'next/headers';
import { auth } from './auth';

/**
 * Get the current user session from an API route / server component.
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session;
  } catch {
    return null;
  }
}

/**
 * Get the current userId, or null if not authenticated.
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id || null;
}

/**
 * Get the full user object, or null if not authenticated.
 */
export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

/**
 * Require admin role. Throws if not authenticated or not admin.
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if ((session.user as Record<string, unknown>).role !== 'admin') {
    throw new Error('Forbidden');
  }

  return session.user;
}

/**
 * Require active status. Throws if user status is not 'active'.
 */
export async function requireActive() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const user = session.user as Record<string, unknown>;

  if (user.status !== 'active' && user.role !== 'admin') {
    throw new Error('Account pending approval');
  }

  return session.user;
}
