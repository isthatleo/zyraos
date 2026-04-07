import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { reportCardsTable, gradebookTable, studentsTable, classesTable } from "@/lib/db-schema"
import { eq, and, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"

// GET /api/[tenant]/report-cards - Get report cards
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
      whereConditions.push(eq(reportCardsTable.studentId, studentId))
    }

    if (classId) {
      whereConditions.push(eq(reportCardsTable.classId, classId))
    }

    if (termId) {
      whereConditions.push(eq(reportCardsTable.termId, termId))
    }

    if (academicYearId) {
      whereConditions.push(eq(reportCardsTable.academicYearId, academicYearId))
    }

    const reportCards = await db
      .select()
      .from(reportCardsTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(reportCardsTable.issuedDate))

    return NextResponse.json({ reportCards })
  } catch (error) {
    console.error("Error fetching report cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch report cards" },
      { status: 500 }
    )
  }
}

// POST /api/[tenant]/report-cards - Generate a new report card
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
      classId,
      termId,
      academicYearId,
      reportType,
      templateId,
      teacherComments,
      principalComments,
      parentComments,
    } = body

    // Calculate grades data for the report card
    const grades = await db
      .select()
      .from(gradebookTable)
      .where(
        and(
          eq(gradebookTable.studentId, studentId),
          eq(gradebookTable.classId, classId),
          termId ? eq(gradebookTable.termId, termId) : undefined,
          eq(gradebookTable.academicYearId, academicYearId)
        )
      )

    // Calculate overall statistics
    const subjectGrades = new Map()
    grades.forEach(grade => {
      if (!subjectGrades.has(grade.subjectId)) {
        subjectGrades.set(grade.subjectId, [])
      }
      subjectGrades.get(grade.subjectId).push(grade)
    })

    const gradesData = []
    let totalWeightedScore = 0
    let totalWeightCount = 0

    for (const [subjectId, gradesOfSubject] of subjectGrades) {
      const weightedSum = (gradesOfSubject as any[]).reduce((sum: number, grade: any) => {
        return sum + (Number(grade.percentage) || 0) * (Number(grade.weight) || 1)
      }, 0)
      const totalWeight = (gradesOfSubject as any[]).reduce((sum: number, grade: any) => sum + (Number(grade.weight) || 1), 0)
      const averagePercentage = totalWeight > 0 ? weightedSum / totalWeight : 0

      gradesData.push({
        subjectId,
        averagePercentage,
        grade: getGradeFromPercentage(averagePercentage),
        assessments: gradesOfSubject.length,
      })

      totalWeightedScore += averagePercentage
      totalWeightCount += 1
    }

    const overallPercentage = totalWeightCount > 0 ? totalWeightedScore / totalWeightCount : 0
    const overallGrade = getGradeFromPercentage(overallPercentage)

    // Generate report card number
    const reportCardNumber = `RC-${Date.now()}-${studentId.slice(-6)}`

    const newReportCard = await db
      .insert(reportCardsTable)
      .values({
        id: crypto.randomUUID(),
        reportCardNumber,
        templateId,
        studentId,
        classId,
        termId,
        academicYearId,
        reportType,
        overallGrade,
        overallPercentage: overallPercentage !== null ? String(overallPercentage) : null,
        teacherComments,
        principalComments,
        parentComments,
        issuedBy: session.user.id,
        gradesData: gradesData,
      })
      .returning()

    return NextResponse.json({ reportCard: newReportCard[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating report card:", error)
    return NextResponse.json(
      { error: "Failed to create report card" },
      { status: 500 }
    )
  }
}

function getGradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A"
  if (percentage >= 80) return "B"
  if (percentage >= 70) return "C"
  if (percentage >= 60) return "D"
  return "F"
}
