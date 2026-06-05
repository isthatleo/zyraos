import { NextResponse, type NextRequest } from "next/server";

import { getTenantSubdomain } from "@/lib/tenant-routing";

const PUBLIC_FILE = /\.(.*)$/;
const RESERVED_PATHS = new Set([
  "api",
  "_next",
  "favicon.ico",
  "icon.svg",
  "master",
  "signup",
  "access-denied",
]);

function applySecurityHeaders(response: NextResponse, tenantSlug?: string | null) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Tenant-Slug", tenantSlug || "none");
  return response;
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const host = request.headers.get("host") || "";
  const tenantSlug = getTenantSubdomain(host);
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "";

  if (tenantSlug && firstSegment === tenantSlug) {
    const cleanPath = pathname.replace(`/${tenantSlug}`, "") || "/";
    url.pathname = cleanPath === "/" || cleanPath === "/login" ? "/staff" : cleanPath;
    return applySecurityHeaders(NextResponse.redirect(url), tenantSlug);
  }

  if (tenantSlug && pathname === "/") {
    url.pathname = `/${tenantSlug}`;
    return applySecurityHeaders(NextResponse.rewrite(url), tenantSlug);
  }

  if (tenantSlug && pathname === "/login") {
    url.pathname = "/staff";
    return applySecurityHeaders(NextResponse.redirect(url), tenantSlug);
  }

  if (
    tenantSlug &&
    !PUBLIC_FILE.test(pathname) &&
    !RESERVED_PATHS.has(firstSegment)
  ) {
    url.pathname = pathname === "/" ? `/${tenantSlug}/login` : `/${tenantSlug}${pathname}`;
    return applySecurityHeaders(NextResponse.rewrite(url), tenantSlug);
  }

  return applySecurityHeaders(NextResponse.next(), tenantSlug);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|uploads).*)"],
};
