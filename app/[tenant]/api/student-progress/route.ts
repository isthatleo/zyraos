import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { studentProgressTable } from "@/lib/db-schema"
import { eq, and, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"

// GET /api/[tenant]/student-progress - Get student progress records
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const academicYearId = searchParams.get("academicYearId")
    const progressType = searchParams.get("progressType")

    let whereConditions = []

    if (studentId) {
      whereConditions.push(eq(studentProgressTable.studentId, studentId))
    }

    if (academicYearId) {
      whereConditions.push(eq(studentProgressTable.academicYearId, academicYearId))
    }

    if (progressType) {
      whereConditions.push(eq(studentProgressTable.progressType, progressType))
    }

    const progressRecords = await db
      .select()
      .from(studentProgressTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(studentProgressTable.progressDate))

    return NextResponse.json({ progressRecords })
  } catch (error) {
    console.error("Error fetching student progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch student progress" },
      { status: 500 }
    )
  }
}

// POST /api/[tenant]/student-progress - Create a new progress record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      studentId,
      academicYearId,
      termId,
      subjectId,
      progressType,
      progressDate,
      progressValue,
      progressNote,
      isPositive,
      category,
    } = body

    const newProgressRecord = await db
      .insert(studentProgressTable)
      .values({
        id: crypto.randomUUID(),
        studentId,
        academicYearId,
        termId,
        subjectId,
        progressType,
        progressDate: new Date(progressDate),
        progressValue: progressValue !== undefined ? String(progressValue) : undefined,
        progressNote,
        recordedBy: session.user.id,
        isPositive: isPositive !== undefined ? isPositive : true,
        category,
      })
      .returning()

    return NextResponse.json({ progressRecord: newProgressRecord[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating progress record:", error)
    return NextResponse.json(
      { error: "Failed to create progress record" },
      { status: 500 }
    )
  }
}
