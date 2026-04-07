import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemSettingsTable, smsProvidersTable, emailProvidersTable, paystackConfigTable } from "@/lib/db-schema";
import { eq } from "drizzle-orm";

// POST /api/tenant/settings - Save settings
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const body = await req.json();

    if (type === "sms") {
      // Save SMS provider config
      const [config] = await db
        .insert(smsProvidersTable)
        .values({
          id: crypto.randomUUID(),
          name: body.provider,
          displayName: body.provider.toUpperCase(),
          apiKey: body.apiKey,
          accountSid: body.accountSid || null,
          senderName: body.senderName,
          isActive: true,
          status: "active",
          metadata: body,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: smsProvidersTable.name,
          set: {
            apiKey: body.apiKey,
            accountSid: body.accountSid,
            senderName: body.senderName,
            updatedAt: new Date(),
          },
        })
        .returning();

      return NextResponse.json(config);
    }

    if (type === "email") {
      // Save Email provider config
      const [config] = await db
        .insert(emailProvidersTable)
        .values({
          id: crypto.randomUUID(),
          name: body.provider,
          displayName: body.provider.toUpperCase(),
          apiKey: body.apiKey,
          senderEmail: body.senderEmail,
          senderName: body.senderName,
          isActive: true,
          status: "active",
          metadata: body,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: emailProvidersTable.name,
          set: {
            apiKey: body.apiKey,
            senderEmail: body.senderEmail,
            senderName: body.senderName,
            updatedAt: new Date(),
          },
        })
        .returning();

      return NextResponse.json(config);
    }

    if (type === "paystack") {
      // Save Paystack config
      const [config] = await db
        .insert(paystackConfigTable)
        .values({
          id: crypto.randomUUID(),
          publicKey: body.publicKey,
          secretKey: body.secretKey,
          testMode: body.testMode,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return NextResponse.json(config);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

