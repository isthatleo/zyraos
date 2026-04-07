import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcastDeliveriesTable } from "@/lib/db-schema";
import { eq, desc } from "drizzle-orm";

// GET /api/tenant/broadcasts/[id]/report - Get broadcast delivery report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deliveries = await db
      .select()
      .from(broadcastDeliveriesTable)
      .where(eq(broadcastDeliveriesTable.broadcastId, id))
      .orderBy(desc(broadcastDeliveriesTable.createdAt));

    const stats = {
      total: deliveries.length,
      sent: deliveries.filter((d) => d.status === "sent").length,
      delivered: deliveries.filter((d) => d.status === "delivered").length,
      failed: deliveries.filter((d) => d.status === "failed").length,
      pending: deliveries.filter((d) => d.status === "pending").length,
      bounced: deliveries.filter((d) => d.status === "bounced").length,
    };

    return NextResponse.json({
      broadcastId: id,
      stats,
      deliveries,
    });
  } catch (error) {
    console.error("Error fetching broadcast report:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcast report" },
      { status: 500 }
    );
  }
}

