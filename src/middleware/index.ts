import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTenantFromRequest } from './lib/tenant-utils';

export async function middleware(request: NextRequest) {
  const pathName = request.nextUrl.pathname;

  if (pathName.startsWith('/api/seed')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('better-auth.session_token');
  const hasSession = !!sessionCookie;

  const tenantSlug = getTenantFromRequest(request);
  const host = request.headers.get('host');
  console.log('Middleware: host =', host, 'tenantSlug =', tenantSlug, 'path =', pathName);
  const isLocalhost = request.headers.get('host')?.includes('localhost');

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login', '/signup', '/api/auth', '/api/tenant/auth',
    '/about', '/testimonials', '/contact',
    '/privacy', '/terms', '/cookies', '/data-protection',
    '/master/login',
  ];
  const isPublicRoute = publicRoutes.some(route => pathName.startsWith(route));

  if (tenantSlug && tenantSlug !== 'localhost' && tenantSlug !== 'www') {
    if (!hasSession && !isPublicRoute && pathName !== '/' && pathName !== '' && !pathName.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', tenantSlug);
    return response;
  }

  // Master domain: allow public pages and root
  if (!hasSession && !isPublicRoute && pathName !== '/' && !pathName.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/master/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
