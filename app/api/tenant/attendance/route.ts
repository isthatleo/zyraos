import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendanceTable } from "@/lib/db-schema";
import { eq, and } from "drizzle-orm";
import { attendanceSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const validated = attendanceSchema.parse(body);
    const attendanceId = `attendance_${Date.now()}`;

    await db.insert(attendanceTable).values({
      id: attendanceId,
      schoolId,
      studentId: validated.studentId,
      classId: validated.classId,
      date: new Date(validated.date),
      status: validated.status,
      remarks: validated.remarks,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, attendanceId, message: "Attendance recorded successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Attendance recording error:", error);
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const studentId = request.nextUrl.searchParams.get("studentId");
    const classId = request.nextUrl.searchParams.get("classId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    let query = db.select().from(attendanceTable).where(eq(attendanceTable.schoolId, schoolId));

    if (studentId) {
      query = db
        .select()
        .from(attendanceTable)
        .where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.studentId, studentId)));
    }

    if (classId) {
      query = db
        .select()
        .from(attendanceTable)
        .where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.classId, classId)));
    }

    const records = await query;

    return NextResponse.json(
      { success: true, records, total: records.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("Attendance retrieval error:", error);
    return NextResponse.json({ error: "Failed to retrieve attendance records" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendanceId, ...updateData } = body;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !attendanceId) {
      return NextResponse.json({ error: "School ID and Attendance ID are required" }, { status: 400 });
    }

    await db
      .update(attendanceTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(attendanceTable.id, attendanceId), eq(attendanceTable.schoolId, schoolId)));

    return NextResponse.json({ success: true, message: "Attendance updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Attendance update error:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}

