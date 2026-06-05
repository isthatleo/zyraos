import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examsTable, assessmentsTable, gradesTable } from "@/lib/db-schema";
import { eq } from "drizzle-orm";
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
      name: validated.name,
      description: validated.description,
      classId: validated.classIds[0],
      academicYearId: validated.academicYearId,
      termId: body.termId || "term_default",
      examDate: new Date(validated.startDate),
      totalMarks: String(body.totalMarks || 100),
      passingMarks: body.passingMarks ? String(body.passingMarks) : undefined,
      examType: body.examType || "exam",
      status: body.status || "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, examId, message: "Exam created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
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
      name: validated.name,
      assessmentType: validated.type,
      subjectId: validated.subjectId,
      classId: validated.classId,
      academicYearId: body.academicYearId || "year_default",
      termId: body.termId || "term_default",
      totalScore: String(validated.totalMarks),
      dueDate: new Date(validated.dueDate),
      description: validated.description,
      createdBy: body.createdBy || "system",
      status: body.status || "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, assessmentId, message: "Assessment created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
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
      studentId: validated.studentId,
      subjectId: body.subjectId || "subject_default",
      classId: body.classId || "class_default",
      academicYearId: body.academicYearId || "year_default",
      termId: body.termId,
      assessmentType: body.assessmentType || "assessment",
      score: String(validated.marksObtained),
      maxScore: String(body.maxScore || 100),
      assessmentDate: validated.submissionDate ? new Date(validated.submissionDate) : new Date(),
      teacherId: body.teacherId || "system",
      notes: validated.feedback,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, gradeId, message: "Grade recorded successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
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
      const exams = await db.select().from(examsTable);
      return NextResponse.json({ success: true, exams, total: exams.length }, { status: 200 });
    } else if (pathname.includes("/assessments")) {
      const classId = request.nextUrl.searchParams.get("classId");
      const assessments = classId
        ? await db.select().from(assessmentsTable).where(eq(assessmentsTable.classId, classId))
        : await db.select().from(assessmentsTable);
      return NextResponse.json({ success: true, assessments, total: assessments.length }, { status: 200 });
    } else if (pathname.includes("/grades")) {
      const studentId = request.nextUrl.searchParams.get("studentId");
      const grades = studentId
        ? await db.select().from(gradesTable).where(eq(gradesTable.studentId, studentId))
        : await db.select().from(gradesTable);
      return NextResponse.json({ success: true, grades, total: grades.length }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

