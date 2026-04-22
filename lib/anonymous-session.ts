import { prisma, Prisma } from '@/lib/db';

/**
 * Genere un code alphanumerique de 6 caracteres
 */
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut I, O, 0, 1 pour eviter confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Genere un code unique (verifie qu'il n'existe pas deja)
 */
export async function generateUniqueCode(): Promise<string> {
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.studioAnonymousSession.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }

    code = generateCode();
    attempts++;
  }

  // Si on n'arrive pas a generer un code unique apres plusieurs tentatives,
  // on ajoute un timestamp
  return generateCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

/**
 * Recupere ou cree une session anonyme
 */
export async function getOrCreateAnonymousSession(
  existingCode?: string,
  metadata?: Record<string, unknown>
) {
  // Si un code existe deja, verifier qu'il est valide
  if (existingCode) {
    const existingSession = await prisma.studioAnonymousSession.findUnique({
      where: { code: existingCode },
    });

    if (existingSession && existingSession.expiresAt > new Date()) {
      return existingSession;
    }
  }

  // Creer une nouvelle session
  const code = await generateUniqueCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Expire dans 30 jours

  return prisma.studioAnonymousSession.create({
    data: {
      code,
      expiresAt,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

/**
 * Cree une nouvelle session anonyme
 * Retourne l'objet session avec code et id
 */
export async function createAnonymousSession(metadata?: Record<string, unknown>) {
  const code = await generateUniqueCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Expire dans 30 jours

  const session = await prisma.studioAnonymousSession.create({
    data: {
      code,
      expiresAt,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return session;
}

/**
 * Valide une session anonyme
 */
export async function validateAnonymousSession(code: string) {
  const session = await prisma.studioAnonymousSession.findUnique({
    where: { code },
    include: {
      _count: {
        select: {
          studios: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

/**
 * Recupere la session (authentifiee ou anonyme) depuis les headers/cookies
 */
export async function getSession(headers: Headers) {
  const cookieHeader = headers.get('cookie');
  if (!cookieHeader) return { user: null, anonymousSession: null };

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...vals] = c.trim().split('=');
      return [key, vals.join('=')];
    })
  );

  const anonymousCode = cookies['studio_anonymous_code'];

  // Verifier session anonyme
  if (anonymousCode) {
    const anonymousSession = await validateAnonymousSession(anonymousCode);
    if (anonymousSession) {
      return { user: null, anonymousSession };
    }
  }

  return { user: null, anonymousSession: null };
}
