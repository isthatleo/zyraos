import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  studentsTable,
  classesTable,
  gradebookTable,
  subjectsTable,
  tenantUsersTable,
  studentProgressTable,
  academicYearsTable,
  termsTable
} from "@/lib/db-schema"
import { eq, and, desc, sql, avg, count, sum } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")
    const termId = searchParams.get("termId")
    const academicYearId = searchParams.get("academicYearId")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Get student basic info
    const [student] = await tenantDb
      .select({
        id: studentsTable.id,
        name: tenantUsersTable.name,
        studentNumber: studentsTable.admissionNumber,
        classId: studentsTable.classId,
        className: classesTable.name,
      })
      .from(studentsTable)
      .leftJoin(tenantUsersTable, eq(studentsTable.userId, tenantUsersTable.id))
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(eq(studentsTable.id, id))

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Build where conditions for filtering
    let gradeWhereConditions = [eq(gradebookTable.studentId, id)]
    let progressWhereConditions = [eq(studentProgressTable.studentId, id)]

    if (termId) {
      gradeWhereConditions.push(eq(gradebookTable.termId, termId))
      progressWhereConditions.push(eq(studentProgressTable.termId, termId))
    }
    if (academicYearId) {
      gradeWhereConditions.push(eq(gradebookTable.academicYearId, academicYearId))
      progressWhereConditions.push(eq(studentProgressTable.academicYearId, academicYearId))
    }

    // Get grades
    const grades = await tenantDb
      .select({
        id: gradebookTable.id,
        subjectId: gradebookTable.subjectId,
        subjectName: subjectsTable.name,
        assessmentType: gradebookTable.assessmentType,
        assessmentName: gradebookTable.assessmentName,
        score: gradebookTable.score,
        maxScore: gradebookTable.maxScore,
        percentage: gradebookTable.percentage,
        grade: gradebookTable.grade,
        assessmentDate: gradebookTable.assessmentDate,
        teacherId: gradebookTable.teacherId,
        teacherName: tenantUsersTable.name,
      })
      .from(gradebookTable)
      .leftJoin(subjectsTable, eq(gradebookTable.subjectId, subjectsTable.id))
      .leftJoin(tenantUsersTable, eq(gradebookTable.teacherId, tenantUsersTable.id))
      .where(and(...gradeWhereConditions))
      .orderBy(desc(gradebookTable.assessmentDate))

    // Get progress notes
    const progressNotes = await tenantDb
      .select({
        id: studentProgressTable.id,
        category: studentProgressTable.category,
        progressNote: studentProgressTable.progressNote,
        isPositive: studentProgressTable.isPositive,
        createdAt: studentProgressTable.createdAt,
        recordedBy: studentProgressTable.recordedBy,
        recordedByName: tenantUsersTable.name,
        termId: studentProgressTable.termId,
        academicYearId: studentProgressTable.academicYearId,
      })
      .from(studentProgressTable)
      .leftJoin(tenantUsersTable, eq(studentProgressTable.recordedBy, tenantUsersTable.id))
      .where(and(...progressWhereConditions))
      .orderBy(desc(studentProgressTable.createdAt))

    // Calculate attendance (this would need an attendance table in a real implementation)
    // For now, using mock data
    const attendance = {
      totalDays: 180,
      presentDays: 162,
      percentage: 90.0,
    }

    // Calculate overall stats
    const validGrades = grades.filter(g => g.percentage !== null)
    const averageGrade = validGrades.length > 0
      ? validGrades.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0) / validGrades.length
      : 0

    // Mock GPA calculation (would need grading scale)
    const gpa = averageGrade > 0 ? (averageGrade / 20) - 1 : 0 // Simple conversion

    // Mock ranking (would need complex calculation)
    const rank = Math.floor(Math.random() * 50) + 1
    const totalStudents = 50

    const overallStats = {
      averageGrade,
      gpa: Math.max(0, Math.min(4.0, gpa)),
      rank,
      totalStudents,
    }

    return NextResponse.json({
      student,
      grades,
      progressNotes,
      attendance,
      overallStats,
    })
  } catch (error) {
    console.error("Error fetching student progress:", error)
    return NextResponse.json({ error: "Failed to fetch student progress" }, { status: 500 })
  }
}

export async function POST(
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
      category,
      progressNote,
      isPositive,
      termId,
      academicYearId,
      recordedBy,
    } = body

    if (!category || !progressNote || !recordedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [progressEntry] = await tenantDb
      .insert(studentProgressTable)
      .values({
        id: crypto.randomUUID(),
        studentId: id,
        academicYearId,
        termId: termId || null,
        subjectId: null,
        progressType: "overall",
        progressDate: new Date(),
        progressValue: null,
        progressNote,
        recordedBy,
        isPositive: isPositive || true,
        category,
      })
      .returning()

    return NextResponse.json(progressEntry)
  } catch (error) {
    console.error("Error creating progress note:", error)
    return NextResponse.json({ error: "Failed to create progress note" }, { status: 500 })
  }
}
