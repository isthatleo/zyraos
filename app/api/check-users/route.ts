import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Check if any users exist
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM "user"`);
    const userCount = (result.rows?.[0] as { count: string })?.count ?? "0";
    
    return NextResponse.json({ 
      hasUsers: parseInt(userCount) > 0,
      userCount: parseInt(userCount)
    });
  } catch (error) {
    console.error("Error checking users:", error);
    return NextResponse.json(
      { error: "Failed to check users" },
      { status: 500 }
    );
  }
}

