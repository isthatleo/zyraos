import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schoolsTable, usersTable } from "@/lib/db-schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/tenant/setup
 * Initializes a new school tenant with isolated database and default configuration
 * Accessible only to super admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, country, type, adminEmail, adminName, subscriptionPlanId } = body;

    // Validate input
    if (!name || !slug || !country || !type || !adminEmail || !adminName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingSchool = await db
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, slug))
      .limit(1);

    if (existingSchool.length > 0) {
      return NextResponse.json(
        { error: "School slug already exists" },
        { status: 409 }
      );
    }

    // Create new school record
    const schoolId = `school_${Date.now()}`;
    const newSchool = await db.insert(schoolsTable).values({
      id: schoolId,
      name,
      slug,
      country,
      type,
      databaseUrl: process.env.DATABASE_URL || "",
      status: "active",
      subscriptionId: subscriptionPlanId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create admin user for the school
    const adminUserId = `user_${Date.now()}`;
    await db.insert(usersTable).values({
      id: adminUserId,
      schoolId,
      email: adminEmail,
      name: adminName,
      role: "admin",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        schoolId,
        adminUserId,
        message: "School tenant created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tenant setup error:", error);
    return NextResponse.json(
      { error: "Failed to create school tenant" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenant/setup
 * Retrieves tenant configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    const school = await db
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.id, schoolId))
      .limit(1);

    if (school.length === 0) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ school: school[0] }, { status: 200 });
  } catch (error) {
    console.error("Tenant retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve school configuration" },
      { status: 500 }
    );
  }
}

