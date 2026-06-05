import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import { eq, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { accountTable, passwordSecurityTable, userTable } from "../lib/db-schema";
import { normalizeDatabaseUrl } from "../lib/database-url";
import { validatePasswordPolicy } from "../lib/password-access";

async function main() {
  const email = process.env.TENANT_USER_EMAIL;
  const password = process.env.TENANT_USER_PASSWORD;
  const tenantSlug = process.env.TENANT_SLUG || null;

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!email) throw new Error("TENANT_USER_EMAIL is required");
  if (!password) throw new Error("TENANT_USER_PASSWORD is required");

  const passwordError = validatePasswordPolicy(password);
  if (passwordError) throw new Error(passwordError);

  const pool = new Pool({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  const db = drizzle(pool);

  try {
    const [user] = await db.select().from(userTable).where(ilike(userTable.email, email)).limit(1);
    if (!user) throw new Error(`No user found for ${email}`);

    const now = new Date();
    const passwordHash = await hashPassword(password);
    const [account] = await db
      .select({ id: accountTable.id })
      .from(accountTable)
      .where(eq(accountTable.userId, user.id))
      .limit(1);

    if (account) {
      await db
        .update(accountTable)
        .set({
          accountId: user.id,
          providerId: "credential",
          password: passwordHash,
          updatedAt: now,
        })
        .where(eq(accountTable.id, account.id));
    } else {
      await db.insert(accountTable).values({
        id: `${user.id}-credential`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db
      .insert(passwordSecurityTable)
      .values({
        userId: user.id,
        tenantSlug,
        forcePasswordChange: true,
        temporaryPasswordIssuedAt: now,
        reason: "manual_tenant_password_repair",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: passwordSecurityTable.userId,
        set: {
          tenantSlug,
          forcePasswordChange: true,
          temporaryPasswordIssuedAt: now,
          reason: "manual_tenant_password_repair",
          updatedAt: now,
        },
      });

    console.log(`Temporary password reset for ${email}${tenantSlug ? ` on ${tenantSlug}` : ""}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to reset tenant user password:", error);
  process.exit(1);
});
