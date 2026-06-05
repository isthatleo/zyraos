import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { masterDb } from "@/lib/db";
import { accountTable } from "@/lib/db-schema";
import { clearForcePasswordChange, hashCredentialPassword, validatePasswordPolicy } from "@/lib/password-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "Password and confirmation are required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const passwordHash = await hashCredentialPassword(password);
    const updated = await masterDb
      .update(accountTable)
      .set({
        accountId: session.user.id,
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(and(eq(accountTable.userId, session.user.id), eq(accountTable.providerId, "credential")))
      .returning({ id: accountTable.id });

    if (!updated.length) {
      return NextResponse.json({ error: "Credential account was not found." }, { status: 404 });
    }

    await clearForcePasswordChange(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete access password update failed:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
