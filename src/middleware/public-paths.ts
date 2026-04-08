// Public paths middleware
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
  '/data-protection',
  '/testimonials',
  '/pricing',
  '/api/health',
  '/api/ping',
];

const PUBLIC_PATH_PREFIXES = [
  '/_next',
  '/images',
  '/favicon.ico',
  '/public',
  '/api/auth',
  '/api/webhooks',
];

export function isPublicPath(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  // Check prefixes
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function publicPathsMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    // Allow public access
    const response = NextResponse.next();
    response.headers.set('x-public-access', 'true');
    return response;
  }

  // Continue to next middleware
  return NextResponse.next();
}
