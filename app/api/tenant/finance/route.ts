import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feeItemsTable, invoicesTable, paymentsTable } from "@/lib/db-schema";
import { eq, and } from "drizzle-orm";
import { feeItemSchema, invoiceSchema } from "@/lib/validators";
import { ZodError } from "zod";

// =============== FEE ITEMS ===============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    // Route based on body type
    if (body.name && body.amount && body.category) {
      // Fee Item
      const validated = feeItemSchema.parse(body);
      const feeItemId = `fee_${Date.now()}`;

      await db.insert(feeItemsTable).values({
        id: feeItemId,
        schoolId,
        name: validated.name,
        amount: validated.amount,
        currency: validated.currency,
        category: validated.category,
        billingCycle: validated.billingCycle,
        isOptional: validated.isOptional,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, feeItemId, message: "Fee item created successfully" },
        { status: 201 }
      );
    }

    if (body.studentId && body.feeItems) {
      // Invoice
      const validated = invoiceSchema.parse(body);
      const invoiceId = `invoice_${Date.now()}`;

      await db.insert(invoicesTable).values({
        id: invoiceId,
        schoolId,
        studentId: validated.studentId,
        invoiceNumber: `INV-${Date.now()}`,
        amount: body.totalAmount || 0,
        dueDate: new Date(validated.dueDate),
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, invoiceId, message: "Invoice created successfully" },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Finance creation error:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

// =============== GET ===============
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const type = request.nextUrl.searchParams.get("type"); // fee_items, invoices, payments

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    if (type === "fee_items") {
      const fees = await db.select().from(feeItemsTable).where(eq(feeItemsTable.schoolId, schoolId));
      return NextResponse.json({ success: true, fees, total: fees.length }, { status: 200 });
    }

    if (type === "invoices") {
      const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.schoolId, schoolId));
      return NextResponse.json({ success: true, invoices, total: invoices.length }, { status: 200 });
    }

    if (type === "payments") {
      const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.schoolId, schoolId));
      return NextResponse.json({ success: true, payments, total: payments.length }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("Finance retrieval error:", error);
    return NextResponse.json({ error: "Failed to retrieve records" }, { status: 500 });
  }
}

// =============== PUT ===============
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, type, ...updateData } = body;
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId || !recordId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "invoice") {
      await db
        .update(invoicesTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(eq(invoicesTable.id, recordId), eq(invoicesTable.schoolId, schoolId)));
    }

    return NextResponse.json({ success: true, message: "Record updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Finance update error:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

