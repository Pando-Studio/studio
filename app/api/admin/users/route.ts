import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

const VALID_ROLES = ['user', 'viewer', 'creator', 'admin'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

/**
 * GET /api/admin/users
 * List all users (admin only, paginated).
 */
export async function GET(request: Request) {
  const authResult = await requireRole('admin');
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const search = searchParams.get('search') || '';

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        banned: true,
        banReason: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { studios: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * PATCH /api/admin/users
 * Update a user's role or ban status (admin only).
 * Body: { userId: string, role?: string, banned?: boolean, banReason?: string }
 */
export async function PATCH(request: Request) {
  const authResult = await requireRole('admin');
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json() as {
    userId?: string;
    role?: string;
    banned?: boolean;
    banReason?: string;
  };

  const { userId, role, banned, banReason } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Prevent admin from removing their own admin role
  if (role && userId === authResult.userId && role !== 'admin') {
    return NextResponse.json(
      { error: 'Cannot remove your own admin role' },
      { status: 400 },
    );
  }

  // Prevent admin from banning themselves
  if (banned === true && userId === authResult.userId) {
    return NextResponse.json(
      { error: 'Cannot ban yourself' },
      { status: 400 },
    );
  }

  // Validate role if provided
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role as ValidRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 },
      );
    }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (banned !== undefined) {
    updateData.banned = banned;
    if (banned && banReason) {
      updateData.banReason = banReason;
    }
    if (!banned) {
      updateData.banReason = null;
      updateData.banExpires = null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      banned: true,
      banReason: true,
    },
  });

  logger.warn('Admin user update', {
    userId: authResult.userId,
    targetUserId: userId,
    targetEmail: targetUser.email,
    changes: updateData,
  });

  return NextResponse.json({ user: updated });
}
