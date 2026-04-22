import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';

// ── All 28 widget types (for validation) ──

const ALL_WIDGET_TYPES = [
  'QUIZ',
  'WORDCLOUD',
  'ROLEPLAY',
  'PRESENTATION',
  'SLIDE',
  'MULTIPLE_CHOICE',
  'POSTIT',
  'RANKING',
  'OPENTEXT',
  'SEQUENCE',
  'COURSE_MODULE',
  'IMAGE',
  'FAQ',
  'GLOSSARY',
  'SUMMARY',
  'FLASHCARD',
  'TIMELINE',
  'REPORT',
  'DATA_TABLE',
  'AUDIO',
  'VIDEO',
  'MINDMAP',
  'INFOGRAPHIC',
  'SYLLABUS',
  'SESSION_PLAN',
  'PROGRAM_OVERVIEW',
  'CLASS_OVERVIEW',
  'QCM',
] as const;

const VALID_LOCALES = ['fr-lmd', 'fr-secondary', 'fr-pro', 'generic'] as const;

// ── Admin check ──

async function verifyAdmin(): Promise<{
  authorized: boolean;
  userId?: string;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return { authorized: false };

    const role = (session.user as Record<string, unknown>).role;
    if (role !== 'admin') return { authorized: false };

    return { authorized: true, userId: session.user.id };
  } catch {
    return { authorized: false };
  }
}

// ── GET: return instance config (create singleton if missing) ──

export async function GET() {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let config = await prisma.instanceConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await prisma.instanceConfig.create({
        data: {
          id: 'singleton',
          name: 'Qiplim Studio',
          locale: 'generic',
          enabledWidgets: [...ALL_WIDGET_TYPES],
        },
      });
    }

    return NextResponse.json(config);
  } catch (error: unknown) {
    logger.error('Failed to fetch instance config', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ── PATCH: update instance config (admin only) ──

interface PatchBody {
  name?: string;
  logo?: string | null;
  locale?: string;
  enabledWidgets?: string[];
}

export async function PATCH(request: Request) {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as PatchBody;

    // Validate locale
    if (body.locale !== undefined) {
      if (!VALID_LOCALES.includes(body.locale as (typeof VALID_LOCALES)[number])) {
        return NextResponse.json(
          { error: `Invalid locale. Must be one of: ${VALID_LOCALES.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Validate enabledWidgets
    if (body.enabledWidgets !== undefined) {
      if (!Array.isArray(body.enabledWidgets)) {
        return NextResponse.json(
          { error: 'enabledWidgets must be an array' },
          { status: 400 },
        );
      }
      const invalid = body.enabledWidgets.filter(
        (w) => !ALL_WIDGET_TYPES.includes(w as (typeof ALL_WIDGET_TYPES)[number]),
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid widget types: ${invalid.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Validate name
    if (body.name !== undefined && typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.locale !== undefined) updateData.locale = body.locale;
    if (body.enabledWidgets !== undefined) updateData.enabledWidgets = body.enabledWidgets;

    const config = await prisma.instanceConfig.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        name: (body.name as string) || 'Qiplim Studio',
        locale: (body.locale as string) || 'generic',
        enabledWidgets: body.enabledWidgets || [...ALL_WIDGET_TYPES],
        ...(body.logo ? { logo: body.logo } : {}),
      },
    });

    logger.info('Instance config updated', {
      userId: adminCheck.userId,
      fields: Object.keys(updateData),
    });

    return NextResponse.json(config);
  } catch (error: unknown) {
    logger.error('Failed to update instance config', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
