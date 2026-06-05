import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  accountTable,
  platformAdminsTable,
  userTable,
} from "../lib/db-schema";
import { normalizeDatabaseUrl } from "../lib/database-url";

const email = process.env.MASTER_ADMIN_EMAIL || "leonardlomude@icloud.com";
const password = process.env.MASTER_ADMIN_PASSWORD || "Myname@78";
const name = process.env.MASTER_ADMIN_NAME || "Leonard Lomude";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
  });
  const db = drizzle(pool);

  try {
    const now = new Date();
    const [existingUser] = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
    const userId = existingUser?.id || "super-admin-1";
    const passwordHash = await hashPassword(password);

    if (existingUser) {
      await db
        .update(userTable)
        .set({
          name,
          role: "super_admin",
          emailVerified: true,
          updatedAt: now,
        })
        .where(eq(userTable.id, existingUser.id));
    } else {
      await db.insert(userTable).values({
        id: userId,
        email,
        name,
        role: "super_admin",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const [existingAccount] = await db
      .select()
      .from(accountTable)
      .where(eq(accountTable.userId, userId))
      .limit(1);

    if (existingAccount) {
      await db
        .update(accountTable)
        .set({
          accountId: userId,
          providerId: "credential",
          password: passwordHash,
          updatedAt: now,
        })
        .where(eq(accountTable.id, existingAccount.id));
    } else {
      await db.insert(accountTable).values({
        id: `${userId}-credential`,
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    const [existingPlatformAdmin] = await db
      .select()
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.email, email))
      .limit(1);

    if (existingPlatformAdmin) {
      await db
        .update(platformAdminsTable)
        .set({
          name,
          role: "super_admin",
          updatedAt: now,
        })
        .where(eq(platformAdminsTable.id, existingPlatformAdmin.id));
    } else {
      await db.insert(platformAdminsTable).values({
        id: "super-admin-1",
        email,
        name,
        role: "super_admin",
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`Super admin login repaired for ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to repair super admin login:", error);
  process.exit(1);
});
