import { NextRequest, NextResponse } from "next/server"
import { receiptsTable, receiptTemplatesTable, studentsTable, emailProvidersTable } from "@/lib/db-schema"
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

    const { receipt, student } = receiptData

    if (!receipt.recipientEmail) {
      return NextResponse.json({ error: "No recipient email found" }, { status: 400 })
    }

    // Get email provider configuration
    const [emailProvider] = await tenantDb
      .select()
      .from(emailProvidersTable)
      .where(eq(emailProvidersTable.isActive, true))
      .limit(1)

    if (!emailProvider) {
      return NextResponse.json({ error: "No email provider configured" }, { status: 400 })
    }

    // Generate receipt HTML content
    const htmlContent = await generateReceiptHTML(receiptData)

    // Send email
    const emailResult = await sendEmail({
      to: receipt.recipientEmail,
      subject: `Payment Receipt - ${receipt.receiptNumber}`,
      html: htmlContent,
      provider: emailProvider,
    })

    if (emailResult.success) {
      // Update sent timestamp
      await tenantDb
        .update(receiptsTable)
        .set({ sentAt: new Date() })
        .where(eq(receiptsTable.id, id))

      return NextResponse.json({ message: "Email sent successfully" })
    } else {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error sending receipt email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

async function generateReceiptHTML(receiptData: any): Promise<string> {
  const { receipt, template, student } = receiptData

  // This is a placeholder for HTML generation
  // In a real implementation, you would render the template with actual data
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .receipt-details { margin: 20px 0; }
        .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Payment Receipt</h1>
        <p>Receipt Number: ${receipt.receiptNumber}</p>
      </div>

      <div class="receipt-details">
        <p><strong>Student:</strong> ${student?.name || 'N/A'}</p>
        <p><strong>Amount:</strong> <span class="amount">${receipt.currency} ${receipt.amount}</span></p>
        <p><strong>Payment Method:</strong> ${receipt.paymentMethod || 'N/A'}</p>
        <p><strong>Payment Date:</strong> ${new Date(receipt.paymentDate).toLocaleDateString()}</p>
        <p><strong>Issue Date:</strong> ${new Date(receipt.issuedDate).toLocaleDateString()}</p>
      </div>

      <div style="margin-top: 40px; text-align: center; color: #666;">
        <p>Thank you for your payment!</p>
      </div>
    </body>
    </html>
  `
}

async function sendEmail({ to, subject, html, provider }: {
  to: string
  subject: string
  html: string
  provider: any
}): Promise<{ success: boolean; error?: string }> {
  // This is a placeholder for email sending
  // In a real implementation, you would integrate with the email provider API
  try {
    // Simulate email sending
    console.log(`Sending email to ${to} with subject: ${subject}`)

    // Here you would make actual API calls to services like SendGrid, Mailgun, etc.
    // based on the provider configuration

    return { success: true }
  } catch (error) {
    console.error("Email sending failed:", error)
    return { success: false, error: "Email service error" }
  }
}
