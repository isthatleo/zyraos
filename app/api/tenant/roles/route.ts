import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { getTenantRoleDefinitions, normalizeEducationLevel } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const tenantSlug =
      request.nextUrl.searchParams.get("tenant") ||
      request.nextUrl.searchParams.get("slug") ||
      "";

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug is required" },
        { status: 400 }
      );
    }

    const school = await masterDb
      .select({
        id: schoolsTable.id,
        name: schoolsTable.name,
        slug: schoolsTable.slug,
        type: schoolsTable.type,
      })
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, tenantSlug))
      .limit(1);

    if (!school.length) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const level = normalizeEducationLevel(school[0].type);

    return NextResponse.json({
      tenant: school[0],
      level,
      roles: getTenantRoleDefinitions(level),
    });
  } catch (error) {
    console.error("Error loading tenant roles:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("password authentication failed")) {
      return NextResponse.json(
        { error: "Database authentication failed. Update DATABASE_URL with the current database password and restart the dev server." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to load tenant roles" },
      { status: 500 }
    );
  }
}
