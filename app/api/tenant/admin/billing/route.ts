import { NextRequest, NextResponse } from "next/server";

import { GET as ownerBillingGET, PATCH as ownerBillingPATCH } from "@/app/api/tenant/owner/billing/route";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tenantSlug(request: NextRequest) {
  return request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
}

export async function GET(request: NextRequest) {
  const slug = tenantSlug(request);
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  return ownerBillingGET(request);
}

export async function PATCH(request: NextRequest) {
  const slug = tenantSlug(request);
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  return ownerBillingPATCH(request);
}
