import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'accessToken';

/**
 * Protección de rutas en el borde (convención `proxy` de Next.js 16; reemplaza
 * al `middleware` deprecado).
 *
 * Verifica únicamente la PRESENCIA de la sesión para decidir el redirect; no
 * valida la firma del token (eso lo hace el backend en cada request). Sin
 * esto, `/dashboard` se renderizaba para cualquier visitante.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const { pathname, search } = request.nextUrl;

  const isDashboard = pathname.startsWith('/dashboard');
  const isLogin = pathname === '/login';

  if (isDashboard && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
