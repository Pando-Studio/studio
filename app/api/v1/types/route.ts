import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api/api-key-auth';
import { templateRegistry } from '@/lib/widget-templates';
import { logger } from '@/lib/monitoring/logger';

/**
 * GET /api/v1/types
 * List all available widget types with their input schemas.
 * Requires API key authentication.
 */
export async function GET(request: Request) {
  try {
    // --- Auth ---
    const authResult = await authenticateApiKey(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const types = templateRegistry.list().map((t) => {
      const slug = t.id.split('/').pop() ?? t.id;
      return {
        type: slug,
        templateId: t.id,
        name: t.name,
        version: t.version,
        description: t.description ?? null,
        widgetType: t.widgetType,
        inputSchema: t.schema.inputs,
      };
    });

    return NextResponse.json({ types });
  } catch (error: unknown) {
    logger.error('API v1 types error', {
      error: error instanceof Error ? error : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to list types' },
      { status: 500 },
    );
  }
}
