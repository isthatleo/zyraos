/**
 * Multi-Tenant Middleware
 * Handles subdomain resolution and tenant routing
 */

import { NextRequest, NextResponse } from 'next/server';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  domain: string;
  isValid: boolean;
}

/**
 * Extract tenant from subdomain
 * Format: school-name.zyraai.com -> school-name
 */
export function extractTenantFromHost(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];

  // Get parts of the domain
  const parts = hostname.split('.');

  // If it's localhost or single part, no tenant
  if (parts.length < 2 || hostname === 'localhost') {
    return null;
  }

  // For zyraai.com or subdomains
  if (hostname.includes('zyraai.com')) {
    // school-name.zyraai.com -> school-name
    if (parts.length === 3) {
      return parts[0];
    }
    // www.zyraai.com or zyraai.com -> no tenant
    if (parts[0] === 'www' || parts[0] === 'zyraai') {
      return null;
    }
  }

  return null;
}

/**
 * Validate tenant exists and is active
 */
export async function validateTenant(tenantId: string): Promise<boolean> {
  try {
    // Implementation depends on your database
    // Example: const tenant = await db.school.findUnique({ where: { slug: tenantId } });
    // return tenant?.isActive ?? false;

    // For now, return true for all tenants
    return true;
  } catch (error) {
    console.error('[TENANT VALIDATION ERROR]', error);
    return false;
  }
}

/**
 * Get tenant from database
 */
export async function getTenant(tenantId: string): Promise<TenantContext | null> {
  try {
    // Implementation depends on your database
    const isValid = await validateTenant(tenantId);

    if (!isValid) {
      return null;
    }

    return {
      tenantId,
      tenantName: tenantId.replace('-', ' ').toUpperCase(),
      domain: `${tenantId}.zyraai.com`,
      isValid: true,
    };
  } catch (error) {
    console.error('[GET TENANT ERROR]', error);
    return null;
  }
}

/**
 * Middleware for multi-tenant routing
 */
export async function tenantMiddleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Extract tenant from subdomain
  const tenantId = extractTenantFromHost(host);

  // Routes that don't require tenant
  const publicRoutes = ['/login', '/signup', '/auth', '/api/auth', '/_next', '/public'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (tenantId) {
    // Validate tenant
    const isValid = await validateTenant(tenantId);

    if (!isValid) {
      return NextResponse.redirect(new URL('/error/invalid-tenant', request.url));
    }

    // Store tenant in request headers for downstream processing
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenantId);

    // Rewrite to include tenant in URL
    const url = request.nextUrl.clone();
    url.pathname = `/[tenant]${pathname}`;

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } else if (!isPublicRoute) {
    // Non-public routes require a tenant
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

/**
 * Middleware for subdomain redirect
 */
export function redirectMiddleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const tenantId = extractTenantFromHost(host);

  // If no tenant and not on www, redirect to www
  if (!tenantId && !host.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = `www.${host}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Get tenant context from request
 */
export function getTenantFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-tenant-id');
}

/**
 * Validate tenant access for protected routes
 */
export async function validateTenantAccess(request: NextRequest, requiredTenant?: string): Promise<boolean> {
  const tenantId = getTenantFromRequest(request);

  if (!tenantId) {
    return false;
  }

  if (requiredTenant && tenantId !== requiredTenant) {
    return false;
  }

  return validateTenant(tenantId);
}

