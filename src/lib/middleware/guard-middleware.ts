/**
 * Guard middleware functions for route protection
 * Specific implementations for different access levels
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from './tenant-middleware';
import { AuthUser } from '@/lib/guards/permissions';

/**
 * Require authentication
 */
export async function requireAuthMiddleware(request: NextRequest) {
  const authToken = request.headers.get('authorization');
  
  if (!authToken) {
    return NextResponse.json(
      { error: 'Unauthorized: No authentication token' },
      { status: 401 }
    );
  }
  
  // Validate token (implementation depends on your auth system)
  const isValid = await validateToken(authToken);
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid token' },
      { status: 401 }
    );
  }
  
  return NextResponse.next();
}

/**
 * Require specific role
 */
export async function requireRoleMiddleware(request: NextRequest, requiredRoles: string[]) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: User not found' },
      { status: 401 }
    );
  }
  
  if (!requiredRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}

/**
 * Require school access
 */
export async function requireSchoolAccessMiddleware(request: NextRequest) {
  const tenantId = getTenantFromRequest(request);
  const user = await getUserFromRequest(request);
  
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Bad Request: No tenant context' },
      { status: 400 }
    );
  }
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: User not found' },
      { status: 401 }
    );
  }
  
  // Check if user belongs to the school
  if (user.schoolId !== tenantId && user.role !== 'developer' && user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Forbidden: No access to this school' },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}

/**
 * Require permission
 */
export async function requirePermissionMiddleware(request: NextRequest, permission: string) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: User not found' },
      { status: 401 }
    );
  }
  
  // Developer has all permissions
  if (user.role === 'developer') {
    return NextResponse.next();
  }
  
  if (!user.permissions?.includes(permission)) {
    return NextResponse.json(
      { error: `Forbidden: Missing required permission: ${permission}` },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}

/**
 * Validate auth token
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    // Implementation depends on your JWT library
    // Example: return jwt.verify(token, process.env.JWT_SECRET);
    return token.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get user from request
 */
async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return null;
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Decode token (implementation depends on your JWT library)
    // Example: const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded as AuthUser;
    
    return null;
  } catch {
    return null;
  }
}

