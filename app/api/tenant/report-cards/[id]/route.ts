import { NextRequest, NextResponse } from "next/server"
import {
  reportCardsTable,
  studentsTable,
  classesTable,
  termsTable,
  academicYearsTable,
  tenantUsersTable,
  gradebookTable,
  subjectsTable
} from "@/lib/db-schema"
import { eq, and, desc, sql } from "drizzle-orm"
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

    // Get report card with full details
    const [reportCard] = await tenantDb
      .select({
        id: reportCardsTable.id,
        reportCardNumber: reportCardsTable.reportCardNumber,
        studentId: reportCardsTable.studentId,
        studentName: tenantUsersTable.name,
        admissionNumber: studentsTable.admissionNumber,
        classId: reportCardsTable.classId,
        className: classesTable.name,
        termId: reportCardsTable.termId,
        termName: termsTable.name,
        academicYearId: reportCardsTable.academicYearId,
        academicYearName: academicYearsTable.name,
        reportType: reportCardsTable.reportType,
        overallGrade: reportCardsTable.overallGrade,
        overallPercentage: reportCardsTable.overallPercentage,
        gpa: reportCardsTable.gpa,
        rank: reportCardsTable.rank,
        totalStudents: reportCardsTable.totalStudents,
        attendanceDays: reportCardsTable.attendanceDays,
        totalDays: reportCardsTable.totalDays,
        attendancePercentage: reportCardsTable.attendancePercentage,
        teacherComments: reportCardsTable.teacherComments,
        principalComments: reportCardsTable.principalComments,
        parentComments: reportCardsTable.parentComments,
        issuedDate: reportCardsTable.issuedDate,
        issuedBy: reportCardsTable.issuedBy,
        issuedByName: sql<string>`(SELECT name FROM users WHERE id = ${reportCardsTable.issuedBy})`,
        status: reportCardsTable.status,
        createdAt: reportCardsTable.createdAt,
        updatedAt: reportCardsTable.updatedAt,
      })
      .from(reportCardsTable)
      .leftJoin(studentsTable, eq(reportCardsTable.studentId, studentsTable.id))
      .leftJoin(tenantUsersTable, eq(studentsTable.userId, tenantUsersTable.id))
      .leftJoin(classesTable, eq(reportCardsTable.classId, classesTable.id))
      .leftJoin(termsTable, eq(reportCardsTable.termId, termsTable.id))
      .leftJoin(academicYearsTable, eq(reportCardsTable.academicYearId, academicYearsTable.id))
      .where(eq(reportCardsTable.id, id))

    if (!reportCard) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }

    // Get gradebook entries for this report card
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
        weight: gradebookTable.weight,
        assessmentDate: gradebookTable.assessmentDate,
        teacherId: gradebookTable.teacherId,
        teacherName: tenantUsersTable.name,
        notes: gradebookTable.notes,
        isExcused: gradebookTable.isExcused,
      })
      .from(gradebookTable)
      .leftJoin(subjectsTable, eq(gradebookTable.subjectId, subjectsTable.id))
      .leftJoin(tenantUsersTable, eq(gradebookTable.teacherId, tenantUsersTable.id))
      .where(
        and(
          eq(gradebookTable.studentId, reportCard.studentId),
          eq(gradebookTable.classId, reportCard.classId),
          eq(gradebookTable.academicYearId, reportCard.academicYearId),
          reportCard.termId ? eq(gradebookTable.termId, reportCard.termId) : undefined
        )
      )
      .orderBy(desc(gradebookTable.assessmentDate))

    return NextResponse.json({
      reportCard,
      grades,
    })
  } catch (error) {
    console.error("Error fetching report card:", error)
    return NextResponse.json({ error: "Failed to fetch report card" }, { status: 500 })
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
      overallGrade,
      overallPercentage,
      gpa,
      rank,
      totalStudents,
      attendanceDays,
      totalDays,
      attendancePercentage,
      teacherComments,
      principalComments,
      parentComments,
      status,
    } = body

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Calculate attendance percentage if not provided
    const calculatedAttendancePercentage = attendancePercentage ||
      (totalDays > 0 ? (attendanceDays / totalDays) * 100 : null)

    const [updatedReportCard] = await tenantDb
      .update(reportCardsTable)
      .set({
        overallGrade,
        overallPercentage,
        gpa,
        rank,
        totalStudents,
        attendanceDays,
        totalDays,
        attendancePercentage: calculatedAttendancePercentage,
        teacherComments,
        principalComments,
        parentComments,
        status,
        updatedAt: new Date(),
      })
      .where(eq(reportCardsTable.id, id))
      .returning()

    if (!updatedReportCard) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }

    return NextResponse.json(updatedReportCard)
  } catch (error) {
    console.error("Error updating report card:", error)
    return NextResponse.json({ error: "Failed to update report card" }, { status: 500 })
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

    const [deletedReportCard] = await tenantDb
      .delete(reportCardsTable)
      .where(eq(reportCardsTable.id, id))
      .returning()

    if (!deletedReportCard) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Report card deleted successfully" })
  } catch (error) {
    console.error("Error deleting report card:", error)
    return NextResponse.json({ error: "Failed to delete report card" }, { status: 500 })
  }
}
