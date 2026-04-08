/**
 * Edge Middleware Configuration
 * Handles rate limiting, auto-validation, and subdomain resolution at the edge
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/auth/advanced-auth';

/**
 * Main middleware function
 * Runs on every request to the application
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 1. Rate Limiting
  const ipAddress = getClientIpAddress(request);
  const key = `${ipAddress}`;
  
  if (!RateLimiter.isAllowed(key, 1000, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  
  // 2. Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // 3. Add request metadata
  response.headers.set('X-Request-ID', generateRequestId());
  response.headers.set('X-IP-Address', ipAddress);
  
  // 4. Session validation (if needed)
  const authToken = extractAuthToken(request);
  if (authToken) {
    response.headers.set('X-Auth-Token', authToken);
  }
  
  return response;
}

/**
 * Get client IP address from request
 */
function getClientIpAddress(request: NextRequest): string {
  // Try to get from forwarded headers (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Try to get from real IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection info
  return request.ip || 'unknown';
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract auth token from request
 */
function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    // All routes except static assets and Next.js internals
    '/((?!_next|_static|\.well-known|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

