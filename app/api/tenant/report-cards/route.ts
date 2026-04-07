import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  reportCardsTable,
  studentsTable,
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
    const classId = searchParams.get("classId")
    const termId = searchParams.get("termId")
    const academicYearId = searchParams.get("academicYearId")
    const studentId = searchParams.get("studentId")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    let whereConditions = []

    if (classId) whereConditions.push(eq(reportCardsTable.classId, classId))
    if (termId) whereConditions.push(eq(reportCardsTable.termId, termId))
    if (academicYearId) whereConditions.push(eq(reportCardsTable.academicYearId, academicYearId))
    if (studentId) whereConditions.push(eq(reportCardsTable.studentId, studentId))

    // Get report cards with related data
    const reportCards = await tenantDb
      .select({
        id: reportCardsTable.id,
        reportCardNumber: reportCardsTable.reportCardNumber,
        studentId: reportCardsTable.studentId,
        studentName: tenantUsersTable.name,
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
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(reportCardsTable.issuedDate))

    return NextResponse.json({ reportCards })
  } catch (error) {
    console.error("Error fetching report cards:", error)
    return NextResponse.json({ error: "Failed to fetch report cards" }, { status: 500 })
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
      classId,
      termId,
      academicYearId,
      reportType,
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
      issuedBy,
      status,
    } = body

    if (!studentId || !classId || !academicYearId || !issuedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Generate report card number
    const reportCardNumber = `RC-${Date.now()}`

    // Calculate attendance percentage if not provided
    const calculatedAttendancePercentage = attendancePercentage ||
      (totalDays > 0 ? (attendanceDays / totalDays) * 100 : null)

    const [reportCard] = await tenantDb
      .insert(reportCardsTable)
      .values({
        id: crypto.randomUUID(),
        reportCardNumber,
        templateId: null,
        studentId,
        classId,
        termId,
        academicYearId,
        reportType: reportType || "termly",
        overallGrade,
        overallPercentage,
        gpa,
        rank,
        totalStudents,
        attendanceDays: attendanceDays || 0,
        totalDays: totalDays || 0,
        attendancePercentage: calculatedAttendancePercentage,
        teacherComments,
        principalComments,
        parentComments,
        issuedDate: new Date(),
        issuedBy,
        status: status || "draft",
        pdfUrl: null,
        metadata: null,
        gradesData: null,
      })
      .returning()

    return NextResponse.json(reportCard)
  } catch (error) {
    console.error("Error creating report card:", error)
    return NextResponse.json({ error: "Failed to create report card" }, { status: 500 })
  }
}
