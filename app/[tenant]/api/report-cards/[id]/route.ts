import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { reportCardsTable } from "@/lib/db-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

// PUT /api/[tenant]/report-cards/[id] - Update a report card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      teacherComments,
      principalComments,
      parentComments,
      status,
    } = body

    const updatedReportCard = await db
      .update(reportCardsTable)
      .set({
        teacherComments,
        principalComments,
        parentComments,
        status,
        updatedAt: new Date(),
      })
      .where(eq(reportCardsTable.id, id))
      .returning()

    if (updatedReportCard.length === 0) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }

    return NextResponse.json({ reportCard: updatedReportCard[0] })
  } catch (error) {
    console.error("Error updating report card:", error)
    return NextResponse.json(
      { error: "Failed to update report card" },
      { status: 500 }
    )
  }
}

// DELETE /api/[tenant]/report-cards/[id] - Delete a report card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const deletedReportCard = await db
      .delete(reportCardsTable)
      .where(eq(reportCardsTable.id, id))
      .returning()

    if (deletedReportCard.length === 0) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Report card deleted successfully" })
  } catch (error) {
    console.error("Error deleting report card:", error)
    return NextResponse.json(
      { error: "Failed to delete report card" },
      { status: 500 }
    )
  }
}
