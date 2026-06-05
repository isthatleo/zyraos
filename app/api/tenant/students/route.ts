import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentsTable, tenantUsersTable } from "@/lib/db-schema";
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

    await db.insert(tenantUsersTable).values({
      id: userId,
      email: validated.email || `${userId}@student.local`,
      name: `${validated.firstName} ${validated.lastName}`,
      roleId: body.roleId || "student",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(studentsTable).values({
      id: studentId,
      userId,
      admissionNumber: body.admissionNumber || `ADM-${Date.now()}`,
      dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
      gender: validated.gender || "other",
      address: validated.homeAddress,
      phone: validated.phone,
      classId: validated.classId,
      enrollmentDate: new Date(),
      status: validated.enrollmentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, studentId, userId, message: "Student enrolled successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
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
        .where(eq(studentsTable.id, studentId))
        .limit(1);

      return NextResponse.json({ success: true, student: student[0] || null }, { status: 200 });
    }

    const students = classId
      ? await db.select().from(studentsTable).where(eq(studentsTable.classId, classId))
      : await db.select().from(studentsTable);

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
      .where(eq(studentsTable.id, studentId));

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
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(studentsTable.id, studentId));

    return NextResponse.json({ success: true, message: "Student deactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Student deletion error:", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}

