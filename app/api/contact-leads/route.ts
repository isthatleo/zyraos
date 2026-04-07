import { NextRequest, NextResponse } from "next/server"

// Contact leads are stored and forwarded to super admin notifications
export async function POST(request: NextRequest) {
  try {
    const lead = await request.json()

    // TODO: Once DB is wired, insert into contact_leads table
    // and create a notification for super admin
    console.log("New contact lead:", {
      ...lead,
      receivedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: "Lead received" })
  } catch (error) {
    console.error("Error processing contact lead:", error)
    return NextResponse.json(
      { error: "Failed to process lead" },
      { status: 500 }
    )
  }
}
