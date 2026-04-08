import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentsTable, usersTable, classesTable } from "@/lib/db-schema";
import { eq, and } from "drizzle-orm";
import { studentEnrollmentSchema } from "@/lib/validators";
import { ZodError } from "zod";

/**
 * POST /api/tenant/students
 * Enroll a new student
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const validated = studentEnrollmentSchema.parse(body);
    const studentId = `student_${Date.now()}`;
    const userId = `user_${Date.now()}`;

    // Create student record
    await db.insert(studentsTable).values({
      id: studentId,
      schoolId,
      userId,
      firstName: validated.firstName,
      lastName: validated.lastName,
      otherNames: validated.otherNames,
      email: validated.email,
      phone: validated.phone,
      dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
      gender: validated.gender,
      nationality: validated.nationality,
      homeAddress: validated.homeAddress,
      classId: validated.classId,
      enrollmentStatus: validated.enrollmentStatus,
      enrollmentDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create associated user account
    if (validated.email) {
      await db.insert(usersTable).values({
        id: userId,
        schoolId,
        email: validated.email,
        name: `${validated.firstName} ${validated.lastName}`,
        role: "student",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json(
      { success: true, studentId, userId, message: "Student enrolled successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Student enrollment error:", error);
    return NextResponse.json({ error: "Failed to enroll student" }, { status: 500 });
  }
}

/**
 * GET /api/tenant/students
 * Retrieve all students or specific student
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const studentId = request.nextUrl.searchParams.get("studentId");
    const classId = request.nextUrl.searchParams.get("classId");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    if (studentId) {
      const student = await db
        .select()
        .from(studentsTable)
        .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)))
        .limit(1);

      return NextResponse.json({ success: true, student: student[0] || null }, { status: 200 });
    }

    let query = db.select().from(studentsTable).where(eq(studentsTable.schoolId, schoolId));

    if (classId) {
      query = db
        .select()
        .from(studentsTable)
        .where(and(eq(studentsTable.schoolId, schoolId), eq(studentsTable.classId, classId)));
    }

    const students = await query;

    return NextResponse.json({ success: true, students, total: students.length }, { status: 200 });
  } catch (error) {
    console.error("Student retrieval error:", error);
    return NextResponse.json({ error: "Failed to retrieve students" }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/students
 * Update student information
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, ...updateData } = body;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: "School ID and Student ID are required" }, { status: 400 });
    }

    await db
      .update(studentsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)));

    return NextResponse.json({ success: true, message: "Student updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Student update error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

/**
 * DELETE /api/tenant/students
 * Deactivate or delete a student
 */
export async function DELETE(request: NextRequest) {
  try {
    const { studentId } = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: "School ID and Student ID are required" }, { status: 400 });
    }

    // Soft delete by updating status
    await db
      .update(studentsTable)
      .set({ enrollmentStatus: "suspended", updatedAt: new Date() })
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)));

    return NextResponse.json({ success: true, message: "Student deactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Student deletion error:", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}

