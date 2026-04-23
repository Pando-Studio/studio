import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes qui necessitent une authentification OU une session anonyme
const protectedRoutes = ['/dashboard', '/studios', '/settings'];
// Routes d'authentification (redirection si deja connecte)
const authRoutes = ['/login', '/register'];
// Routes publiques (accessibles sans rien)
// Note: /docs and /developers are now under [locale]/ and handled by next-intl routing
const publicRoutes = ['/', '/recover', '/docs', '/developers', '/ai-act', '/on-premise'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Tokens de session
  const sessionToken = request.cookies.get('better-auth.session_token')?.value
    || request.cookies.get('__Secure-better-auth.session_token')?.value;
  const anonymousCode = request.cookies.get('studio_anonymous_code')?.value;

  const isAuthenticated = !!sessionToken;
  const hasAnonymousSession = !!anonymousCode;

  // Base URL pour les redirections (evite localhost derriere reverse proxy)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;

  // Strip locale prefix for route matching (e.g., /en/docs -> /docs, /fr/developers -> /developers)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr)/, '') || '/';

  // Routes protegees : permettre l'acces si authentifie OU session anonyme
  if (protectedRoutes.some((route) => pathnameWithoutLocale.startsWith(route))) {
    if (!isAuthenticated && !hasAnonymousSession) {
      // Pas de session du tout - creer une session anonyme via API
      // On redirige vers une page intermediaire qui creera la session
      const response = NextResponse.redirect(new URL('/api/auth/anonymous', baseUrl));
      // Stocker l'URL de destination pour rediriger apres
      response.cookies.set('redirect_after_anonymous', pathname, {
        httpOnly: true,
        maxAge: 60, // 1 minute
        path: '/',
      });
      return response;
    }
  }

  // Routes auth : rediriger vers dashboard si deja connecte
  if (authRoutes.includes(pathnameWithoutLocale)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
  }

  // Page de recuperation : accessible sans session
  if (pathnameWithoutLocale === '/recover') {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
