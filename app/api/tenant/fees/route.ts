import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feesTable, studentFeesTable, studentsTable } from "@/lib/db-schema";
import { eq, desc } from "drizzle-orm";

// GET /api/tenant/fees - Get all fees or student fees
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");

    if (studentId) {
      // Get fees for specific student
      const fees = await db
        .select()
        .from(studentFeesTable)
        .where(eq(studentFeesTable.studentId, studentId))
        .orderBy(desc(studentFeesTable.createdAt));

      return NextResponse.json(fees);
    }

    // Get all fees
    const fees = await db
      .select()
      .from(feesTable)
      .where(semester ? eq(feesTable.semester, semester) : undefined)
      .orderBy(desc(feesTable.createdAt));
    return NextResponse.json(fees);
  } catch (error) {
    console.error("Error fetching fees:", error);
    return NextResponse.json(
      { error: "Failed to fetch fees" },
      { status: 500 }
    );
  }
}

// POST /api/tenant/fees - Create new fee
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      feeType,
      name,
      description,
      amount,
      semester,
      academicYearId,
      dueDate,
    } = body;

    if (!feeType || !name || !amount || !semester || !academicYearId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const feeId = crypto.randomUUID();

    const [fee] = await db
      .insert(feesTable)
      .values({
        id: feeId,
        feeType,
        name,
        description,
        amount: amount.toString(),
        semester,
        academicYearId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(fee, { status: 201 });
  } catch (error) {
    console.error("Error creating fee:", error);
    return NextResponse.json(
      { error: "Failed to create fee" },
      { status: 500 }
    );
  }
}

