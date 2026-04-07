import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  paymentsTable,
  studentFeesTable,
  transactionLedgerTable,
} from "@/lib/db-schema";
import { eq } from "drizzle-orm";

// POST /api/webhooks/paystack - Handle Paystack webhook events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (event === "charge.success") {
      const { reference, amount, customer } = data;

      // Find payment by reference
      const payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.paymentReference, reference));

      if (!payments || payments.length === 0) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        );
      }

      const payment = payments[0];

      // Update payment status
      await db
        .update(paymentsTable)
        .set({
          status: "completed",
          completedAt: new Date(),
          providerResponse: data,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));

      // Update student fee
      const studentFees = await db
        .select()
        .from(studentFeesTable)
        .where(eq(studentFeesTable.id, payment.studentFeeId));

      if (studentFees.length > 0) {
        const studentFee = studentFees[0];
        const newAmountPaid =
          Number(studentFee.amountPaid) + Number(payment.amount);
        const totalAmount = Number(studentFee.totalAmount);
        const newBalance = totalAmount - newAmountPaid;

        let newStatus = "partial";
        if (newAmountPaid >= totalAmount) {
          newStatus = "paid";
        } else if (newAmountPaid === 0) {
          newStatus = "unpaid";
        }

        await db
          .update(studentFeesTable)
          .set({
            amountPaid: newAmountPaid.toString(),
            outstandingBalance: newBalance.toString(),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(studentFeesTable.id, payment.studentFeeId));

        // Create transaction ledger entry
        await db.insert(transactionLedgerTable).values({
          id: crypto.randomUUID(),
          paymentId: payment.id,
          studentId: payment.studentId,
          type: "payment",
          amount: payment.amount,
          description: `Payment for ${studentFee.feeId}`,
          reference: reference,
          balance: newBalance.toString(),
          createdAt: new Date(),
        });
      }

      return NextResponse.json({ success: true });
    }

    if (event === "charge.failed") {
      const { reference } = data;

      // Find payment by reference
      const payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.paymentReference, reference));

      if (payments && payments.length > 0) {
        const payment = payments[0];
        await db
          .update(paymentsTable)
          .set({
            status: "failed",
            failedAt: new Date(),
            providerResponse: data,
            updatedAt: new Date(),
          })
          .where(eq(paymentsTable.id, payment.id));
      }

      return NextResponse.json({ success: true });
    }

    // Log unhandled events
    console.log("Unhandled Paystack webhook event:", event);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

