import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversationMembersTable, conversationsTable } from "@/lib/db-schema";
import { eq, and, isNull } from "drizzle-orm";

// GET /api/tenant/conversations/[id]/members - Get conversation members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const members = await db
      .select()
      .from(conversationMembersTable)
      .where(
        and(
          eq(conversationMembersTable.conversationId, id),
          isNull(conversationMembersTable.leftAt)
        )
      );

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST /api/tenant/conversations/[id]/members - Add member to conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const memberId = crypto.randomUUID();

    await db.insert(conversationMembersTable).values({
      id: memberId,
      conversationId: id,
      userId,
      role: "member",
      joinedAt: new Date(),
      leftAt: null,
    });

    return NextResponse.json({ id: memberId }, { status: 201 });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

