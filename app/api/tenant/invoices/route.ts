import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentFeesTable, paymentsTable } from "@/lib/db-schema";
import { eq, sum } from "drizzle-orm";

// GET /api/tenant/invoices - Get student invoices
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    // Get all student fees
    const fees = await db
      .select()
      .from(studentFeesTable)
      .where(eq(studentFeesTable.studentId, studentId));

    // Calculate summary
    const summary = {
      studentId,
      totalFees: fees.reduce((sum, fee) => sum + Number(fee.totalAmount), 0),
      totalPaid: fees.reduce((sum, fee) => sum + Number(fee.amountPaid), 0),
      outstandingBalance: fees.reduce(
        (sum, fee) => sum + Number(fee.outstandingBalance),
        0
      ),
      fees,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

