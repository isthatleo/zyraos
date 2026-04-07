import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Check if any users exist
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM "user"`);
    const userCount = parseInt((result.rows?.[0] as { count: string })?.count ?? "0");

    if (userCount > 1) {
      return NextResponse.json(
        { error: "First user has already been set. Cannot promote more admins this way." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Update user metadata to include admin role
    await db.execute(sql`
      UPDATE "user" 
      SET role = 'admin' 
      WHERE id = ${userId}
    `);

    return NextResponse.json({ 
      success: true,
      message: "User promoted to admin"
    });
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    return NextResponse.json(
      { error: "Failed to promote user to admin" },
      { status: 500 }
    );
  }
}

