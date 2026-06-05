import { NextRequest, NextResponse } from "next/server";
import { getEmailProviderStatus, getSmsProviderStatus, sendPlatformEmail, sendPlatformSms } from "@/lib/platform-integrations";

// POST /api/tenant/settings/test - Test provider connection
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const body = await req.json().catch(() => ({}));

    if (type === "sms") {
      const result = body.to
        ? await sendPlatformSms({ to: String(body.to), body: String(body.message || "Roxan SMS provider test") })
        : await getSmsProviderStatus();
      return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 400 });
    }

    if (type === "email") {
      const result = body.to
        ? await sendPlatformEmail({
            to: String(body.to),
            subject: String(body.subject || "Roxan email provider test"),
            html: body.html ? String(body.html) : "<strong>Roxan email provider test</strong>",
            text: body.text ? String(body.text) : "Roxan email provider test",
          })
        : await getEmailProviderStatus();
      return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 400 });
    }

    if (type === "paystack") {
      // Test Paystack connection
      if (!body.publicKey || !body.secretKey) {
        return NextResponse.json(
          { success: false, error: "Missing API keys" },
          { status: 400 }
        );
      }

      // Make test API call to Paystack
      try {
        const response = await fetch("https://api.paystack.co/bank", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${body.secretKey}`,
          },
        });

        if (!response.ok) {
          return NextResponse.json(
            { success: false, error: "Invalid Paystack credentials" },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true, message: "Paystack connection successful" });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: "Failed to connect to Paystack" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error testing provider:", error);
    return NextResponse.json(
      { error: "Failed to test provider" },
      { status: 500 }
    );
  }
}

