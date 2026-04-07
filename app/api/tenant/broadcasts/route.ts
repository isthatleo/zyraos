import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcastsTable, broadcastDeliveriesTable, tenantUsersTable, studentsTable } from "@/lib/db-schema";
import { eq, inArray, desc, and } from "drizzle-orm";

// GET /api/tenant/broadcasts - Get all broadcasts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereConditions = [];
    if (status) {
      whereConditions.push(eq(broadcastsTable.status, status));
    }
    if (channel) {
      whereConditions.push(eq(broadcastsTable.channel, channel));
    }

    const broadcasts = await db
      .select()
      .from(broadcastsTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(broadcastsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(broadcasts);
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcasts" },
      { status: 500 }
    );
  }
}

// POST /api/tenant/broadcasts - Create new broadcast
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      createdBy,
      title,
      content,
      channel,
      targetAudience,
      targetAudienceIds,
      scheduledAt,
    } = body;

    if (!createdBy || !title || !content || !channel || !targetAudience) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const broadcastId = crypto.randomUUID();
    const status = scheduledAt ? "scheduled" : "draft";

    const [broadcast] = await db
      .insert(broadcastsTable)
      .values({
        id: broadcastId,
        createdBy,
        title,
        content,
        channel,
        targetAudience,
        targetAudienceIds: targetAudienceIds || [],
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        metadata: {
          characterCount: content.length,
          smsCount: Math.ceil(content.length / 160),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(broadcast, { status: 201 });
  } catch (error) {
    console.error("Error creating broadcast:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast" },
      { status: 500 }
    );
  }
}

