import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { listFiles } from '@/lib/connectors/google-drive';
import { logger } from '@/lib/monitoring/logger';

/**
 * GET /api/studios/:id/connectors/google-drive/files
 *
 * Lists files from the authenticated user's Google Drive.
 * Query params: folderId?, pageToken?
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: studioId } = await params;

    // --- Auth ---
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify studio ownership
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { userId: true },
    });

    if (!studio || studio.userId !== userId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // --- Retrieve Google access token from BetterAuth account table ---
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId,
        providerId: 'google',
      },
      select: {
        accessToken: true,
      },
    });

    if (!googleAccount?.accessToken) {
      return NextResponse.json(
        { error: 'No Google account linked. Please sign in with Google first.' },
        { status: 403 },
      );
    }

    // --- Query params ---
    const { searchParams } = request.nextUrl;
    const folderId = searchParams.get('folderId') ?? undefined;
    const pageToken = searchParams.get('pageToken') ?? undefined;

    // --- List files ---
    const result = await listFiles(googleAccount.accessToken, {
      folderId,
      pageToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Google Drive list files error', { error: message });

    // If token expired / insufficient scope, return 403
    if (message.includes('401') || message.includes('403')) {
      return NextResponse.json(
        { error: 'Google Drive access denied. The token may have expired or lacks the drive.readonly scope.' },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to list Google Drive files' },
      { status: 500 },
    );
  }
}
