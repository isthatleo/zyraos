import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjectsTable } from "@/lib/db-schema";
import { eq, and } from "drizzle-orm";
import { subjectSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const validated = subjectSchema.parse(body);
    const subjectId = `subject_${Date.now()}`;

    await db.insert(subjectsTable).values({
      id: subjectId,
      schoolId,
      name: validated.name,
      code: validated.code,
      description: validated.description,
      category: validated.category,
      creditHours: validated.creditHours,
      isMandatory: validated.isMandatory,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, subjectId, message: "Subject created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Subject creation error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const category = request.nextUrl.searchParams.get("category");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    let query = db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId));

    if (category) {
      query = db
        .select()
        .from(subjectsTable)
        .where(and(eq(subjectsTable.schoolId, schoolId), eq(subjectsTable.category, category)));
    }

    const subjects = await query;

    return NextResponse.json({ success: true, subjects, total: subjects.length }, { status: 200 });
  } catch (error) {
    console.error("Subject retrieval error:", error);
    return NextResponse.json({ error: "Failed to retrieve subjects" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjectId, ...updateData } = body;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !subjectId) {
      return NextResponse.json({ error: "School ID and Subject ID are required" }, { status: 400 });
    }

    await db
      .update(subjectsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.schoolId, schoolId)));

    return NextResponse.json({ success: true, message: "Subject updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Subject update error:", error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { subjectId } = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !subjectId) {
      return NextResponse.json({ error: "School ID and Subject ID are required" }, { status: 400 });
    }

    await db
      .delete(subjectsTable)
      .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.schoolId, schoolId)));

    return NextResponse.json({ success: true, message: "Subject deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Subject deletion error:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}

