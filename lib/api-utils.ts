import { NextRequest, NextResponse } from "next/server";

// Type definitions for tenant context
export interface TenantContext {
  schoolId: string;
  userId: string;
  role: string;
  schoolSlug: string;
}

// Middleware to extract and validate tenant information
export async function extractTenantContext(request: NextRequest): Promise<TenantContext | null> {
  try {
    const schoolId = request.headers.get("x-school-id");
    const userId = request.headers.get("x-user-id");
    const role = request.headers.get("x-user-role");
    const schoolSlug = request.nextUrl.pathname.split("/")[1]; // Extract from URL

    if (!schoolId || !userId || !role) {
      return null;
    }

    return {
      schoolId,
      userId,
      role,
      schoolSlug,
    };
  } catch (error) {
    console.error("Error extracting tenant context:", error);
    return null;
  }
}

// Check if user has required permission
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

// Validate school access
export function validateSchoolAccess(tenantContext: TenantContext, requiredRoles: string[]): boolean {
  return hasPermission(tenantContext.role, requiredRoles);
}

// Respond with error when unauthorized
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized access" },
    { status: 403 }
  );
}

// Respond with error when resource not found
export function notFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: "Resource not found" },
    { status: 404 }
  );
}

// Format error response
export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Format success response
export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

