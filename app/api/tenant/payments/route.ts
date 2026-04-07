import { NextRequest, NextResponse } from "next/server";
import { paymentsTable } from "@/lib/db-schema";
import { eq, desc, and } from "drizzle-orm";
import { getTenantDbBySlug } from "@/lib/db";

// GET /api/tenant/payments - Get all payments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get("tenant");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug);

    let whereConditions = [];
    if (studentId) {
      whereConditions.push(eq(paymentsTable.studentId, studentId));
    }
    if (status) {
      whereConditions.push(eq(paymentsTable.status, status));
    }

    const payments = await tenantDb
      .select()
      .from(paymentsTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(paymentsTable.createdAt));
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/tenant/payments - Create new payment (Paystack)
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      studentId,
      studentFeeId,
      amount,
      paymentMethod,
      provider = "paystack",
    } = body;

    if (!studentId || !studentFeeId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug);
    const paymentId = crypto.randomUUID();
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const [payment] = await tenantDb
      .insert(paymentsTable)
      .values({
        id: paymentId,
        studentId,
        studentFeeId,
        amount: amount.toString(),
        paymentMethod,
        paymentReference,
        provider,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // For Paystack, generate authorization URL
    if (provider === "paystack") {
      const paystackResponse = {
        authorization_url: `https://checkout.paystack.com/${paymentReference}`,
        access_code: paymentReference,
        reference: paymentReference,
      };

      return NextResponse.json(
        {
          payment,
          paystack: paystackResponse,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

