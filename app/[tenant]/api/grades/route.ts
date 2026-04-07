import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { gradebookTable, gradingScalesTable } from "@/lib/db-schema"
import { eq, and, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"

// GET /api/[tenant]/grades - Get grades for a student or class
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
    const classId = searchParams.get("classId")
    const termId = searchParams.get("termId")
    const academicYearId = searchParams.get("academicYearId")

    let whereConditions = []

    if (studentId) {
      whereConditions.push(eq(gradebookTable.studentId, studentId))
    }

    if (classId) {
      whereConditions.push(eq(gradebookTable.classId, classId))
    }

    if (termId) {
      whereConditions.push(eq(gradebookTable.termId, termId))
    }

    if (academicYearId) {
      whereConditions.push(eq(gradebookTable.academicYearId, academicYearId))
    }

    const grades = await db
      .select()
      .from(gradebookTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(gradebookTable.assessmentDate))

    return NextResponse.json({ grades })
  } catch (error) {
    console.error("Error fetching grades:", error)
    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 }
    )
  }
}

// POST /api/[tenant]/grades - Create a new grade entry
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
      subjectId,
      classId,
      termId,
      academicYearId,
      assessmentType,
      assessmentName,
      score,
      maxScore,
      weight,
      assessmentDate,
      notes,
      isExcused,
    } = body

    // Calculate percentage and grade
    let percentage = null
    let grade = null

    if (score !== null && maxScore) {
      percentage = (score / maxScore) * 100

      // Get grading scale for the school
      const gradingScales = await db
        .select()
        .from(gradingScalesTable)
        .where(eq(gradingScalesTable.isActive, true))
        .orderBy(desc(gradingScalesTable.minScore))

      for (const scale of gradingScales) {
        const minScore = Number(scale.minScore)
        const maxScore = Number(scale.maxScore)
        if (percentage >= minScore && percentage <= maxScore) {
          grade = scale.grade
          break
        }
      }
    }

    const newGrade = await db
      .insert(gradebookTable)
      .values({
        id: crypto.randomUUID(),
        studentId,
        subjectId,
        classId,
        termId,
        academicYearId,
        assessmentType,
        assessmentName,
        score: score !== null ? String(score) : null,
        maxScore: maxScore ? String(maxScore) : undefined!,
        percentage: percentage !== null ? String(percentage) : null,
        grade,
        weight: weight ? String(weight) : "1",
        assessmentDate: new Date(assessmentDate),
        teacherId: session.user.id,
        notes,
        isExcused: isExcused || false,
      })
      .returning()

    return NextResponse.json({ grade: newGrade[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating grade:", error)
    return NextResponse.json(
      { error: "Failed to create grade" },
      { status: 500 }
    )
  }
}
