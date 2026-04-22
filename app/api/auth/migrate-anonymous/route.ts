import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * Migre les donnees d'une session anonyme vers un compte utilisateur authentifie
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();

    // Verifier que l'utilisateur est authentifie
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Recuperer le code anonyme
    const anonymousCode = cookieStore.get('studio_anonymous_code')?.value;
    if (!anonymousCode) {
      return NextResponse.json({ migrated: false, message: 'No anonymous session to migrate' });
    }

    // Trouver la session anonyme
    const anonymousSession = await prisma.studioAnonymousSession.findUnique({
      where: { code: anonymousCode },
      include: {
        studios: true,
      },
    });

    if (!anonymousSession) {
      // Supprimer le cookie invalide
      cookieStore.delete('studio_anonymous_code');
      return NextResponse.json({ migrated: false, message: 'Anonymous session not found' });
    }

    // Migrer les studios vers l'utilisateur authentifie
    const migratedStudios = await prisma.studio.updateMany({
      where: { anonymousSessionId: anonymousSession.id },
      data: {
        userId: session.user.id,
        anonymousSessionId: null,
        isAnonymous: false,
      },
    });

    // Supprimer la session anonyme
    await prisma.studioAnonymousSession.delete({
      where: { id: anonymousSession.id },
    });

    // Supprimer le cookie
    cookieStore.delete('studio_anonymous_code');

    return NextResponse.json({
      migrated: true,
      studiosCount: migratedStudios.count,
      message: `Successfully migrated ${migratedStudios.count} studio(s) to your account`,
    });
  } catch (error) {
    console.error('Error migrating anonymous session:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
