import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { receiptsTable, studentsTable, paymentsTable, studentFeesTable, tenantUsersTable } from "@/lib/db-schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Get receipts with student information
    const receipts = await tenantDb
      .select({
        id: receiptsTable.id,
        receiptNumber: receiptsTable.receiptNumber,
        studentId: receiptsTable.studentId,
        studentName: tenantUsersTable.name,
        paymentType: receiptsTable.paymentMethod,
        amount: receiptsTable.amount,
        currency: receiptsTable.currency,
        paymentDate: receiptsTable.paymentDate,
        issuedDate: receiptsTable.issuedDate,
        status: receiptsTable.status,
        recipientEmail: receiptsTable.recipientEmail,
        recipientPhone: receiptsTable.recipientPhone,
      })
      .from(receiptsTable)
      .leftJoin(studentsTable, eq(receiptsTable.studentId, studentsTable.id))
      .leftJoin(tenantUsersTable, eq(studentsTable.userId, tenantUsersTable.id))
      .orderBy(desc(receiptsTable.issuedDate))

    return NextResponse.json(receipts)
  } catch (error) {
    console.error("Error fetching receipts:", error)
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const body = await request.json()
    const {
      templateId,
      studentId,
      paymentId,
      studentFeeId,
      amount,
      currency,
      paymentMethod,
      paymentDate,
      issuedBy,
      recipientEmail,
      recipientPhone,
      metadata,
      notes,
    } = body

    if (!studentId || !amount || !issuedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`

    const [receipt] = await tenantDb
      .insert(receiptsTable)
      .values({
        id: crypto.randomUUID(),
        receiptNumber,
        templateId,
        studentId,
        paymentId,
        studentFeeId,
        amount: amount.toString(),
        currency: currency || "ZAR",
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        issuedBy,
        recipientEmail,
        recipientPhone,
        metadata,
        notes,
        issuedDate: new Date(),
        status: "issued",
      })
      .returning()

    return NextResponse.json(receipt)
  } catch (error) {
    console.error("Error creating receipt:", error)
    return NextResponse.json({ error: "Failed to create receipt" }, { status: 500 })
  }
}
