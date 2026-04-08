/**
 * Root Middleware Entry Point
 * This file should be placed at src/middleware.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import type { NextFetchEvent } from 'next/server';

/**
 * Main middleware handler
 * Executes on every request
 */
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // 1. Extract request metadata
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const host = request.headers.get('host') || '';

  // 2. Public routes that bypass middleware
  const publicRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/error',
    '/access-denied',
    '/api/auth',
  ];

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // 3. Handle tenant from subdomain
  const tenantId = extractTenantFromHost(host);

  // 4. Add security headers
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'");

  // Add request metadata
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = getClientIp(request);

  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Client-IP', clientIp);
  response.headers.set('X-Tenant-ID', tenantId || 'none');

  // 5. Rate limiting
  if (!isPublicRoute && !rateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    );
  }

  // 6. Tenant validation
  if (tenantId && !isPublicRoute) {
    const isValidTenant = await validateTenantQuick(tenantId);
    if (!isValidTenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }
  }

  // 7. Log request (optional)
  logRequest({
    requestId,
    method,
    pathname,
    tenantId,
    clientIp,
    timestamp: new Date().toISOString(),
  });

  return response;
}

/**
 * Extract tenant ID from host
 */
function extractTenantFromHost(host: string): string | null {
  const hostname = host.split(':')[0]; // Remove port
  const parts = hostname.split('.');

  // For localhost or no subdomain
  if (hostname === 'localhost' || parts.length < 2) {
    return null;
  }

  // For zyraai.com subdomains
  if (hostname.includes('zyraai.com')) {
    if (parts.length === 3 && parts[0] !== 'www') {
      return parts[0]; // Return subdomain as tenant
    }
  }

  return null;
}

/**
 * Get client IP address
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
  ];

  for (const header of headers) {
    const ip = request.headers.get(header);
    if (ip) {
      return ip.split(',')[0].trim();
    }
  }

  return request.ip || 'unknown';
}

/**
 * Simple rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function rateLimit(clientIp: string, limit: number = 1000, windowMs: number = 60 * 1000): boolean {
  const now = Date.now();
  const record = requestCounts.get(clientIp);

  // Create new record if doesn't exist or window expired
  if (!record || now >= record.resetTime) {
    requestCounts.set(clientIp, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return false;
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * Quick tenant validation
 */
async function validateTenantQuick(tenantId: string): Promise<boolean> {
  try {
    // This is a quick validation, more thorough validation should happen in route handlers
    // You can implement caching here for performance
    return true; // Placeholder
  } catch {
    return false;
  }
}

/**
 * Log request
 */
function logRequest(data: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[REQUEST]', data);
  }
  // Implement proper logging to your logging service
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

