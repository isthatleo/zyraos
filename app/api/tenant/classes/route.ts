import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classesTable } from "@/lib/db-schema";
import { eq } from "drizzle-orm";
import { classSchema } from "@/lib/validators";
import { ZodError } from "zod";

/**
 * POST /api/tenant/classes
 * Create a new class
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Validate input
    const validated = classSchema.parse(body);

    const classId = `class_${Date.now()}`;
    const newClass = await db.insert(classesTable).values({
      id: classId,
      name: validated.name,
      grade: validated.stage,
      section: validated.classCode,
      academicYearId: validated.academicYearId,
      capacity: validated.capacity || 50,
      teacherId: validated.classTeacherId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        classId,
        message: "Class created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Class creation error:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenant/classes
 * Retrieve all classes for a school
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const academicYearId = request.nextUrl.searchParams.get("academicYearId");

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    const classes = academicYearId
      ? await db.select().from(classesTable).where(eq(classesTable.academicYearId, academicYearId))
      : await db.select().from(classesTable);

    return NextResponse.json(
      {
        success: true,
        classes,
        total: classes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Class retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve classes" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenant/classes
 * Update a class
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, ...updateData } = body;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !classId) {
      return NextResponse.json(
        { error: "School ID and Class ID are required" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(classesTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(classesTable.id, classId));

    return NextResponse.json(
      {
        success: true,
        message: "Class updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Class update error:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenant/classes
 * Delete a class
 */
export async function DELETE(request: NextRequest) {
  try {
    const { classId } = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !classId) {
      return NextResponse.json(
        { error: "School ID and Class ID are required" },
        { status: 400 }
      );
    }

    await db
      .delete(classesTable)
      .where(eq(classesTable.id, classId));

    return NextResponse.json(
      {
        success: true,
        message: "Class deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Class deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}

