import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversationsTable, conversationMembersTable, tenantUsersTable } from "@/lib/db-schema";
import { eq, and, or, desc, isNull } from "drizzle-orm";

// GET /api/tenant/conversations - Get all conversations for current user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const conversations = await db
      .select({
        id: conversationsTable.id,
        type: conversationsTable.type,
        name: conversationsTable.name,
        createdBy: conversationsTable.createdBy,
        isArchived: conversationsTable.isArchived,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
      })
      .from(conversationsTable)
      .innerJoin(
        conversationMembersTable,
        eq(conversationMembersTable.conversationId, conversationsTable.id)
      )
      .where(
        and(
          eq(conversationMembersTable.userId, userId),
          isNull(conversationMembersTable.leftAt)
        )
      )
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/tenant/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, createdBy, participantIds } = body;

    if (!type || !createdBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (type === "direct" && !participantIds?.length) {
      return NextResponse.json(
        { error: "Direct conversations require participantIds" },
        { status: 400 }
      );
    }

    const conversationId = crypto.randomUUID();

    // Create conversation
    await db.insert(conversationsTable).values({
      id: conversationId,
      type,
      name: name || undefined,
      createdBy,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add members
    const memberIds = [createdBy, ...(participantIds || [])];
    const members = memberIds.map((userId) => ({
      id: crypto.randomUUID(),
      conversationId,
      userId,
      role: userId === createdBy ? "owner" : "member",
      joinedAt: new Date(),
      leftAt: null,
    }));

    await db.insert(conversationMembersTable).values(members);

    return NextResponse.json(
      { id: conversationId, type, name, createdBy },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

