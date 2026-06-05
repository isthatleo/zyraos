import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user role from database
    const result = await db.execute(sql`
      SELECT role FROM "user" WHERE id = ${session.user.id}
    `);

    const storedRole = (result.rows?.[0] as { role?: string })?.role ?? "user";
    const userRole = normalizeRole(storedRole);

    return NextResponse.json({ 
      role: userRole,
      isAdmin: userRole === "super_admin" || userRole === "owner" || userRole === "school_admin"
    });
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json(
      { error: "Failed to get user role" },
      { status: 500 }
    );
  }
}

