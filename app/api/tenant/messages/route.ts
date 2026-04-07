import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messagesTable, conversationsTable, conversationMembersTable, messageReadStatusTable } from "@/lib/db-schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/tenant/messages - Get all messages for current user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/tenant/messages - Create new message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, senderId, content, attachments } = body;

    if (!conversationId || !senderId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const messageId = crypto.randomUUID();

    const [message] = await db
      .insert(messagesTable)
      .values({
        id: messageId,
        conversationId,
        senderId,
        content,
        attachments: attachments || [],
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}

