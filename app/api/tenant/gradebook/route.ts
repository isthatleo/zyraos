import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  gradebookTable,
  studentsTable,
  subjectsTable,
  classesTable,
  termsTable,
  academicYearsTable,
  tenantUsersTable
} from "@/lib/db-schema"
import { eq, and, desc, sql, gte, lte } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")
    const studentId = searchParams.get("studentId")
    const subjectId = searchParams.get("subjectId")
    const classId = searchParams.get("classId")
    const termId = searchParams.get("termId")
    const academicYearId = searchParams.get("academicYearId")
    const teacherId = searchParams.get("teacherId")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    let whereConditions = []

    if (studentId) whereConditions.push(eq(gradebookTable.studentId, studentId))
    if (subjectId) whereConditions.push(eq(gradebookTable.subjectId, subjectId))
    if (classId) whereConditions.push(eq(gradebookTable.classId, classId))
    if (termId) whereConditions.push(eq(gradebookTable.termId, termId))
    if (academicYearId) whereConditions.push(eq(gradebookTable.academicYearId, academicYearId))
    if (teacherId) whereConditions.push(eq(gradebookTable.teacherId, teacherId))

    // Get gradebook entries with related data
    const grades = await tenantDb
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
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(gradebookTable.assessmentDate));

    return NextResponse.json({ grades })
  } catch (error) {
    console.error("Error fetching grades:", error)
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
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
      grade,
      weight,
      assessmentDate,
      teacherId,
      notes,
      isExcused,
    } = body

    if (!studentId || !subjectId || !classId || !academicYearId || !assessmentType || !assessmentName || !teacherId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Calculate percentage if score and maxScore are provided
    const calculatedPercentage = (score !== null && maxScore && maxScore > 0)
      ? (Number(score) / Number(maxScore)) * 100
      : null

    const [gradeEntry] = await tenantDb
      .insert(gradebookTable)
      .values({
        id: crypto.randomUUID(),
        studentId: studentId!,
        subjectId: subjectId!,
        classId: classId!,
        termId: termId!,
        academicYearId: academicYearId!,
        assessmentType: assessmentType!,
        assessmentName: assessmentName!,
        score: score ? String(score) : null,
        maxScore: String(maxScore),
        percentage: calculatedPercentage !== null ? String(calculatedPercentage) : null,
        grade,
        weight: weight ? String(weight) : "1",
        assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
        teacherId: teacherId!,
        notes,
        isExcused: isExcused || false,
      })
      .returning()

    return NextResponse.json(gradeEntry)
  } catch (error) {
    console.error("Error creating grade entry:", error)
    return NextResponse.json({ error: "Failed to create grade entry" }, { status: 500 })
  }
}
