import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examsTable, assessmentsTable, gradesTable } from "@/lib/db-schema";
import { eq, and } from "drizzle-orm";
import { examSchema, assessmentSchema, gradeSchema } from "@/lib/validators";
import { ZodError } from "zod";

// =============== EXAMS ===============
export async function POST(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const schoolId = request.headers.get("x-school-id");
    const body = await request.json();

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    // Route to appropriate handler
    if (pathname.includes("/exams")) {
      return createExam(body, schoolId);
    } else if (pathname.includes("/assessments")) {
      return createAssessment(body, schoolId);
    } else if (pathname.includes("/grades")) {
      return createGrade(body, schoolId);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function createExam(body: any, schoolId: string) {
  try {
    const validated = examSchema.parse(body);
    const examId = `exam_${Date.now()}`;

    await db.insert(examsTable).values({
      id: examId,
      schoolId,
      name: validated.name,
      examCode: validated.examCode,
      description: validated.description,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      academicYearId: validated.academicYearId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, examId, message: "Exam created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    throw error;
  }
}

async function createAssessment(body: any, schoolId: string) {
  try {
    const validated = assessmentSchema.parse(body);
    const assessmentId = `assessment_${Date.now()}`;

    await db.insert(assessmentsTable).values({
      id: assessmentId,
      schoolId,
      name: validated.name,
      type: validated.type,
      subjectId: validated.subjectId,
      classId: validated.classId,
      totalMarks: validated.totalMarks,
      weightage: validated.weightage,
      dueDate: new Date(validated.dueDate),
      description: validated.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, assessmentId, message: "Assessment created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    throw error;
  }
}

async function createGrade(body: any, schoolId: string) {
  try {
    const validated = gradeSchema.parse(body);
    const gradeId = `grade_${Date.now()}`;

    await db.insert(gradesTable).values({
      id: gradeId,
      schoolId,
      studentId: validated.studentId,
      assessmentId: validated.assessmentId,
      marksObtained: validated.marksObtained,
      feedback: validated.feedback,
      submissionDate: validated.submissionDate ? new Date(validated.submissionDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, gradeId, message: "Grade recorded successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    throw error;
  }
}

// =============== GET ===============
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    if (pathname.includes("/exams")) {
      const exams = await db.select().from(examsTable).where(eq(examsTable.schoolId, schoolId));
      return NextResponse.json({ success: true, exams, total: exams.length }, { status: 200 });
    } else if (pathname.includes("/assessments")) {
      const classId = request.nextUrl.searchParams.get("classId");
      let query = db.select().from(assessmentsTable).where(eq(assessmentsTable.schoolId, schoolId));

      if (classId) {
        query = db
          .select()
          .from(assessmentsTable)
          .where(and(eq(assessmentsTable.schoolId, schoolId), eq(assessmentsTable.classId, classId)));
      }

      const assessments = await query;
      return NextResponse.json({ success: true, assessments, total: assessments.length }, { status: 200 });
    } else if (pathname.includes("/grades")) {
      const studentId = request.nextUrl.searchParams.get("studentId");
      let query = db.select().from(gradesTable).where(eq(gradesTable.schoolId, schoolId));

      if (studentId) {
        query = db
          .select()
          .from(gradesTable)
          .where(and(eq(gradesTable.schoolId, schoolId), eq(gradesTable.studentId, studentId)));
      }

      const grades = await query;
      return NextResponse.json({ success: true, grades, total: grades.length }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

