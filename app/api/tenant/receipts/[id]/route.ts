import { NextRequest, NextResponse } from "next/server"
import { receiptsTable, receiptTemplatesTable, studentsTable, tenantUsersTable } from "@/lib/db-schema"
import { eq, and } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [receipt] = await tenantDb
      .select({
        id: receiptsTable.id,
        receiptNumber: receiptsTable.receiptNumber,
        templateId: receiptsTable.templateId,
        studentId: receiptsTable.studentId,
        studentName: tenantUsersTable.name,
        paymentId: receiptsTable.paymentId,
        studentFeeId: receiptsTable.studentFeeId,
        amount: receiptsTable.amount,
        currency: receiptsTable.currency,
        paymentMethod: receiptsTable.paymentMethod,
        paymentDate: receiptsTable.paymentDate,
        issuedDate: receiptsTable.issuedDate,
        issuedBy: receiptsTable.issuedBy,
        status: receiptsTable.status,
        recipientEmail: receiptsTable.recipientEmail,
        recipientPhone: receiptsTable.recipientPhone,
        sentAt: receiptsTable.sentAt,
        printedAt: receiptsTable.printedAt,
        voidedAt: receiptsTable.voidedAt,
        voidedReason: receiptsTable.voidedReason,
        metadata: receiptsTable.metadata,
        notes: receiptsTable.notes,
        templateData: receiptTemplatesTable.templateData,
      })
      .from(receiptsTable)
      .leftJoin(studentsTable, eq(receiptsTable.studentId, studentsTable.id))
      .leftJoin(tenantUsersTable, eq(studentsTable.userId, tenantUsersTable.id))
      .leftJoin(receiptTemplatesTable, eq(receiptsTable.templateId, receiptTemplatesTable.id))
      .where(eq(receiptsTable.id, id))

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    return NextResponse.json(receipt)
  } catch (error) {
    console.error("Error fetching receipt:", error)
    return NextResponse.json({ error: "Failed to fetch receipt" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const body = await request.json()
    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [updatedReceipt] = await tenantDb
      .update(receiptsTable)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(receiptsTable.id, id))
      .returning()

    if (!updatedReceipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    return NextResponse.json(updatedReceipt)
  } catch (error) {
    console.error("Error updating receipt:", error)
    return NextResponse.json({ error: "Failed to update receipt" }, { status: 500 })
  }
}
