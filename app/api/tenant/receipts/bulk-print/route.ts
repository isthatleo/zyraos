import { NextRequest, NextResponse } from "next/server"
import { receiptsTable, receiptTemplatesTable, studentsTable } from "@/lib/db-schema"
import { eq, inArray } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const { receiptIds } = await request.json()

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json({ error: "Receipt IDs required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Get receipts with template and student data
    const receiptsData = await tenantDb
      .select({
        receipt: receiptsTable,
        template: receiptTemplatesTable,
        student: studentsTable,
      })
      .from(receiptsTable)
      .leftJoin(receiptTemplatesTable, eq(receiptsTable.templateId, receiptTemplatesTable.id))
      .leftJoin(studentsTable, eq(receiptsTable.studentId, studentsTable.id))
      .where(inArray(receiptsTable.id, receiptIds))

    // Generate combined PDF with all receipts
    const pdfBuffer = await generateBulkReceiptsPDF(receiptsData)

    // Update printed timestamps for all receipts
    await tenantDb
      .update(receiptsTable)
      .set({ printedAt: new Date() })
      .where(inArray(receiptsTable.id, receiptIds))

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipts-bulk-${Date.now()}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating bulk receipts PDF:", error)
    return NextResponse.json({ error: "Failed to generate bulk PDF" }, { status: 500 })
  }
}

async function generateBulkReceiptsPDF(receiptsData: any[]): Promise<Buffer> {
  // This is a placeholder for bulk PDF generation
  // In a real implementation, you would use a library like puppeteer or pdfkit
  // to generate a multi-page PDF with all receipts

  let content = "BULK RECEIPTS\n=============\n\n"

  receiptsData.forEach((receiptData, index) => {
    const { receipt, student } = receiptData

    content += `RECEIPT ${index + 1}
--------

Receipt Number: ${receipt.receiptNumber}
Date Issued: ${new Date(receipt.issuedDate).toLocaleDateString()}

Student: ${student?.name || 'N/A'}
Amount: ${receipt.currency} ${receipt.amount}
Payment Method: ${receipt.paymentMethod || 'N/A'}
Payment Date: ${new Date(receipt.paymentDate).toLocaleDateString()}

Status: ${receipt.status.toUpperCase()}

Thank you for your payment!

---
Page Break
---

`
  })

  return Buffer.from(content.trim(), 'utf-8')
}
