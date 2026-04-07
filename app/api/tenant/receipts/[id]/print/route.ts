import { NextRequest, NextResponse } from "next/server"
import { receiptsTable, receiptTemplatesTable, studentsTable } from "@/lib/db-schema"
import { eq } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function POST(
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

    // Get receipt with template and student data
    const [receiptData] = await tenantDb
      .select({
        receipt: receiptsTable,
        template: receiptTemplatesTable,
        student: studentsTable,
      })
      .from(receiptsTable)
      .leftJoin(receiptTemplatesTable, eq(receiptsTable.templateId, receiptTemplatesTable.id))
      .leftJoin(studentsTable, eq(receiptsTable.studentId, studentsTable.id))
      .where(eq(receiptsTable.id, id))

    if (!receiptData) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    // Generate PDF receipt
    const pdfBuffer = await generateReceiptPDF(receiptData)

    // Update printed timestamp
    await tenantDb
      .update(receiptsTable)
      .set({ printedAt: new Date() })
      .where(eq(receiptsTable.id, id))

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receiptData.receipt.receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating receipt PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

async function generateReceiptPDF(receiptData: any): Promise<Buffer> {
  // This is a placeholder for PDF generation
  // In a real implementation, you would use a library like puppeteer or pdfkit
  // For now, we'll return a simple text buffer

  const { receipt, template, student } = receiptData

  const content = `
RECEIPT
========

Receipt Number: ${receipt.receiptNumber}
Date Issued: ${new Date(receipt.issuedDate).toLocaleDateString()}

Student: ${student?.name || 'N/A'}
Amount: ${receipt.currency} ${receipt.amount}
Payment Method: ${receipt.paymentMethod || 'N/A'}
Payment Date: ${new Date(receipt.paymentDate).toLocaleDateString()}

Status: ${receipt.status.toUpperCase()}

Thank you for your payment!
  `.trim()

  return Buffer.from(content, 'utf-8')
}
