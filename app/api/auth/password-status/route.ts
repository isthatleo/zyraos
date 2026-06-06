import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { masterDb } from "@/lib/db";
import { passwordSecurityTable } from "@/lib/db-schema";
import { getCurrentMasterAdmin } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    const masterAdmin = await getCurrentMasterAdmin(request);
    if (masterAdmin) {
      return NextResponse.json({
        authenticated: true,
        mustChangePassword: false,
        tenantSlug: null,
        temporaryPasswordIssuedAt: null,
        passwordLastChangedAt: null,
        reason: null,
      });
    }
    return NextResponse.json({ authenticated: false, mustChangePassword: false }, { status: 401 });
  }

  const rows = await masterDb
    .select({
      forcePasswordChange: passwordSecurityTable.forcePasswordChange,
      temporaryPasswordIssuedAt: passwordSecurityTable.temporaryPasswordIssuedAt,
      passwordLastChangedAt: passwordSecurityTable.passwordLastChangedAt,
      tenantSlug: passwordSecurityTable.tenantSlug,
      reason: passwordSecurityTable.reason,
    })
    .from(passwordSecurityTable)
    .where(eq(passwordSecurityTable.userId, session.user.id))
    .limit(1);

  const security = rows[0];
  return NextResponse.json({
    authenticated: true,
    mustChangePassword: Boolean(security?.forcePasswordChange),
    tenantSlug: security?.tenantSlug || null,
    temporaryPasswordIssuedAt: security?.temporaryPasswordIssuedAt || null,
    passwordLastChangedAt: security?.passwordLastChangedAt || null,
    reason: security?.reason || null,
  });
}
