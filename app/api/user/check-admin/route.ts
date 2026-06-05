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
        { isAdmin: false },
        { status: 200 }
      );
    }

    // Get user role from database
    const result = await db.execute(sql`
      SELECT role FROM "user" WHERE id = ${session.user.id}
    `);

    const storedRole = (result.rows?.[0] as { role?: string })?.role ?? "user";
    const userRole = normalizeRole(storedRole);

    return NextResponse.json({ 
      isAdmin: userRole === "super_admin" || userRole === "owner" || userRole === "school_admin"
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json(
      { isAdmin: false },
      { status: 200 }
    );
  }
}
