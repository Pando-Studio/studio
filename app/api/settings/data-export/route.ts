import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, isAuthError } from '@/lib/api/auth-context';
import { logger } from '@/lib/monitoring/logger';

// ── In-memory rate limit: 1 export per user per day ──

const exportRateLimit = new Map<string, number>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function checkExportRateLimit(userId: string): boolean {
  const lastExport = exportRateLimit.get(userId);
  const now = Date.now();

  if (lastExport && now - lastExport < ONE_DAY_MS) {
    return false;
  }

  exportRateLimit.set(userId, now);
  return true;
}

// ── POST: export all user data as JSON ──

export async function POST() {
  const authResult = await getAuthContext();
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { userId } = authResult;

  if (!checkExportRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Export limit reached. You can export your data once per day.' },
      { status: 429 },
    );
  }

  try {
    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch studios with all related data
    const studios = await prisma.studio.findMany({
      where: { userId },
      include: {
        sources: {
          include: {
            chunks: {
              select: {
                id: true,
                content: true,
                metadata: true,
                pageNumber: true,
                chunkIndex: true,
                createdAt: true,
              },
            },
          },
        },
        widgets: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            data: true,
            status: true,
            order: true,
            kind: true,
            parentId: true,
            slotId: true,
            templateId: true,
            sourceIds: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        conversations: {
          include: {
            messages: {
              select: {
                id: true,
                role: true,
                content: true,
                mode: true,
                citations: true,
                metadata: true,
                createdAt: true,
              },
            },
          },
        },
        presentations: {
          include: {
            versions: {
              include: {
                slides: true,
              },
            },
          },
        },
        coursePlans: {
          select: {
            id: true,
            title: true,
            description: true,
            content: true,
            metadata: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        generationRuns: {
          select: {
            id: true,
            type: true,
            status: true,
            estimatedTokens: true,
            actualTokens: true,
            errorLog: true,
            metadata: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    // Fetch favorites
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      select: {
        id: true,
        widgetId: true,
        coursePlanId: true,
        createdAt: true,
      },
    });

    // Fetch user memories
    const memories = await prisma.userMemory.findMany({
      where: { userId },
      select: {
        id: true,
        category: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch play results
    const playResults = await prisma.widgetPlayResult.findMany({
      where: { userId },
      select: {
        id: true,
        widgetId: true,
        studioId: true,
        status: true,
        score: true,
        maxScore: true,
        duration: true,
        attempts: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch provider configs
    const providerConfigs = await prisma.userProviderConfig.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Note: apiKey excluded for security
      },
    });

    // Fetch document folders
    const documentFolders = await prisma.documentFolder.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        parentId: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch document tags
    const documentTags = await prisma.documentTag.findMany({
      where: { userId },
      include: {
        sources: {
          select: { sourceId: true },
        },
      },
    });

    // Fetch API keys (metadata only)
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      studios,
      favorites,
      memories,
      playResults,
      providerConfigs,
      documentFolders,
      documentTags,
      apiKeys,
    };

    logger.info('User data exported', { userId });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="qiplim-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to export user data', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
