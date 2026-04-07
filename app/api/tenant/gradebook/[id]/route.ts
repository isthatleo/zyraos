import { NextRequest, NextResponse } from "next/server"
import {
  gradebookTable,
  studentsTable,
  subjectsTable,
  classesTable,
  termsTable,
  academicYearsTable,
  tenantUsersTable
} from "@/lib/db-schema"
import { eq, sql } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [grade] = await tenantDb
      .select({
        id: gradebookTable.id,
        studentId: gradebookTable.studentId,
        studentName: tenantUsersTable.name,
        subjectId: gradebookTable.subjectId,
        subjectName: subjectsTable.name,
        classId: gradebookTable.classId,
        className: classesTable.name,
        termId: gradebookTable.termId,
        termName: termsTable.name,
        academicYearId: gradebookTable.academicYearId,
        academicYearName: academicYearsTable.name,
        assessmentType: gradebookTable.assessmentType,
        assessmentName: gradebookTable.assessmentName,
        score: gradebookTable.score,
        maxScore: gradebookTable.maxScore,
        percentage: gradebookTable.percentage,
        grade: gradebookTable.grade,
        weight: gradebookTable.weight,
        assessmentDate: gradebookTable.assessmentDate,
        teacherId: gradebookTable.teacherId,
        teacherName: sql<string>`(SELECT name FROM users WHERE id = ${gradebookTable.teacherId})`,
        notes: gradebookTable.notes,
        isExcused: gradebookTable.isExcused,
        createdAt: gradebookTable.createdAt,
        updatedAt: gradebookTable.updatedAt,
      })
      .from(gradebookTable)
      .leftJoin(studentsTable, eq(gradebookTable.studentId, studentsTable.id))
      .leftJoin(tenantUsersTable, eq(studentsTable.userId, tenantUsersTable.id))
      .leftJoin(subjectsTable, eq(gradebookTable.subjectId, subjectsTable.id))
      .leftJoin(classesTable, eq(gradebookTable.classId, classesTable.id))
      .leftJoin(termsTable, eq(gradebookTable.termId, termsTable.id))
      .leftJoin(academicYearsTable, eq(gradebookTable.academicYearId, academicYearsTable.id))
      .where(eq(gradebookTable.id, id))

    if (!grade) {
      return NextResponse.json({ error: "Grade entry not found" }, { status: 404 })
    }

    return NextResponse.json(grade)
  } catch (error) {
    console.error("Error fetching grade entry:", error)
    return NextResponse.json({ error: "Failed to fetch grade entry" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const body = await request.json()
    const {
      score,
      maxScore,
      grade,
      weight,
      assessmentDate,
      notes,
      isExcused,
    } = body

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Calculate percentage if score and maxScore are provided
    const calculatedPercentage = (score !== null && maxScore && maxScore > 0)
      ? (Number(score) / Number(maxScore)) * 100
      : null

    const [updatedGrade] = await tenantDb
      .update(gradebookTable)
      .set({
        score: score ? String(score) : null,
        maxScore: maxScore ? String(maxScore) : undefined!,
        percentage: calculatedPercentage !== null ? String(calculatedPercentage) : null,
        grade,
        weight: weight ? String(weight) : undefined,
        assessmentDate: assessmentDate ? new Date(assessmentDate) : undefined,
        notes,
        isExcused,
        updatedAt: new Date(),
      })
      .where(eq(gradebookTable.id, id))
      .returning()

    if (!updatedGrade) {
      return NextResponse.json({ error: "Grade entry not found" }, { status: 404 })
    }

    return NextResponse.json(updatedGrade)
  } catch (error) {
    console.error("Error updating grade entry:", error)
    return NextResponse.json({ error: "Failed to update grade entry" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [deletedGrade] = await tenantDb
      .delete(gradebookTable)
      .where(eq(gradebookTable.id, id))
      .returning()

    if (!deletedGrade) {
      return NextResponse.json({ error: "Grade entry not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Grade entry deleted successfully" })
  } catch (error) {
    console.error("Error deleting grade entry:", error)
    return NextResponse.json({ error: "Failed to delete grade entry" }, { status: 500 })
  }
}
