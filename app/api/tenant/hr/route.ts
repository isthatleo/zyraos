import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staffTable, payrollTable, leaveTable } from "@/lib/db-schema";
import { eq } from "drizzle-orm";
import { staffSchema, payrollSchema, leaveSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    // Route based on body type
    if (body.firstName && body.staffId && body.designation) {
      // Staff
      const validated = staffSchema.parse(body);
      const id = `staff_${Date.now()}`;

      await db.insert(staffTable).values({
        id,
        userId: body.userId || `user_${Date.now()}`,
        employeeId: validated.staffId,
        departmentId: body.departmentId || validated.department,
        position: validated.designation,
        hireDate: new Date(validated.hireDate),
        salary: String(validated.baseSalary),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, staffId: id, message: "Staff member added successfully" },
        { status: 201 }
      );
    }

    if (body.staffId && body.month && body.baseSalary) {
      // Payroll
      const validated = payrollSchema.parse(body);
      const id = `payroll_${Date.now()}`;

      await db.insert(payrollTable).values({
        id,
        staffId: validated.staffId,
        payrollPeriod: "monthly",
        payrollMonth: `${validated.year}-${String(validated.month).padStart(2, "0")}`,
        basicSalary: String(validated.baseSalary),
        allowances: String(body.allowancesTotal || 0),
        deductions: String(body.deductionsTotal || 0),
        grossSalary: String(body.grossSalary || validated.baseSalary),
        netSalary: String(validated.netSalary),
        paymentDate: new Date(validated.paymentDate),
        status: validated.paymentStatus === "processed" ? "approved" : validated.paymentStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, payrollId: id, message: "Payroll record created successfully" },
        { status: 201 }
      );
    }

    if (body.staffId && body.leaveType && body.startDate) {
      // Leave Request
      const validated = leaveSchema.parse(body);
      const id = `leave_${Date.now()}`;

      await db.insert(leaveTable).values({
        id,
        staffId: validated.staffId,
        leaveType: validated.leaveType,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        numberOfDays: String(body.numberOfDays || 1),
        reason: validated.reason,
        status: validated.status,
        remarks: validated.approverNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, leaveId: id, message: "Leave request submitted successfully" },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("HR creation error:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const type = request.nextUrl.searchParams.get("type"); // staff, payroll, leave

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    if (type === "staff") {
      const staff = await db.select().from(staffTable);
      return NextResponse.json({ success: true, staff, total: staff.length }, { status: 200 });
    }

    if (type === "payroll") {
      const payroll = await db.select().from(payrollTable);
      return NextResponse.json({ success: true, payroll, total: payroll.length }, { status: 200 });
    }

    if (type === "leave") {
      const leaves = await db.select().from(leaveTable);
      return NextResponse.json({ success: true, leaves, total: leaves.length }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("HR retrieval error:", error);
    return NextResponse.json({ error: "Failed to retrieve records" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, type, ...updateData } = body;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !recordId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "staff") {
      await db
        .update(staffTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(staffTable.id, recordId));
    } else if (type === "leave") {
      await db
        .update(leaveTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(leaveTable.id, recordId));
    }

    return NextResponse.json({ success: true, message: "Record updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("HR update error:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

