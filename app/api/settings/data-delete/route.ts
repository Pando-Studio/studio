import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';

interface DeleteBody {
  confirmEmail: string;
}

// ── DELETE: permanently delete all user data ──

export async function DELETE(request: Request) {
  // Get session directly (we need the email for confirmation)
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DeleteBody;

    if (!body.confirmEmail || body.confirmEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Email confirmation does not match your account email.' },
        { status: 400 },
      );
    }

    logger.warn('User data deletion started', { userId, email: userEmail });

    // Delete in order to respect foreign key constraints.
    // Most cascades are handled by Prisma onDelete: Cascade on the user relation,
    // but we delete studios explicitly first to ensure S3 cleanup can be added later.

    // 1. Get all studio IDs owned by this user
    const userStudios = await prisma.studio.findMany({
      where: { userId },
      select: { id: true },
    });
    const studioIds = userStudios.map((s) => s.id);

    // 2. Delete studio-level data (cascades handle chunks, messages, slides, etc.)
    if (studioIds.length > 0) {
      // Delete deep research runs
      await prisma.deepResearchRun.deleteMany({
        where: { studioId: { in: studioIds } },
      });

      // Delete generation runs
      await prisma.generationRun.deleteMany({
        where: { studioId: { in: studioIds } },
      });

      // Delete studio connectors
      await prisma.studioConnector.deleteMany({
        where: { studioId: { in: studioIds } },
      });

      // Delete studios (cascades: sources->chunks, widgets->slideWidgets, conversations->messages,
      // presentations->versions->slides, coursePlans, providerConfigs, shares, playResults)
      await prisma.studio.deleteMany({
        where: { userId },
      });
    }

    // 3. Delete user-level data
    await prisma.userFavorite.deleteMany({ where: { userId } });
    await prisma.userMemory.deleteMany({ where: { userId } });
    await prisma.widgetPlayResult.deleteMany({ where: { userId } });
    await prisma.userProviderConfig.deleteMany({ where: { userId } });
    await prisma.apiKey.deleteMany({ where: { userId } });
    await prisma.documentTag.deleteMany({ where: { userId } });
    await prisma.documentFolder.deleteMany({ where: { userId } });
    await prisma.studioShare.deleteMany({ where: { userId } });

    // 4. Delete auth data (sessions, accounts)
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });

    // 5. Delete the user record itself
    await prisma.user.delete({ where: { id: userId } });

    logger.warn('User data deletion completed', { userId, email: userEmail });

    return NextResponse.json({
      success: true,
      message: 'All your data has been permanently deleted.',
    });
  } catch (error: unknown) {
    logger.error('Failed to delete user data', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
