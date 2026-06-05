import crypto from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { masterDb } from "@/lib/db";
import { accountTable, passwordSecurityTable, userTable } from "@/lib/db-schema";

export function generateTemporaryPassword() {
  return `Rox-${crypto.randomBytes(5).toString("base64url")}1!`;
}

export function validatePasswordPolicy(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9\s]/.test(password)) return "Password must include a special character.";
  if (/\s/.test(password)) return "Password cannot contain spaces.";
  return null;
}

export async function hashCredentialPassword(password: string) {
  return hashPassword(password);
}

export async function upsertCredentialAuthUser(input: {
  userId: string;
  email: string;
  name: string;
  role: string;
  password: string;
  emailVerified?: boolean;
}) {
  const now = new Date();
  const passwordHash = await hashCredentialPassword(input.password);
  const existingUser = await masterDb
    .select({ id: userTable.id })
    .from(userTable)
    .where(ilike(userTable.email, input.email))
    .limit(1);
  const userId = existingUser[0]?.id || input.userId;

  if (existingUser.length) {
    await masterDb
      .update(userTable)
      .set({
        name: input.name,
        role: input.role,
        updatedAt: now,
      })
      .where(eq(userTable.id, userId));
  } else {
    await masterDb.insert(userTable).values({
      id: userId,
      email: input.email,
      emailVerified: input.emailVerified ?? true,
      name: input.name,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    });
  }

  const credential = await masterDb
    .select({ id: accountTable.id })
    .from(accountTable)
    .where(and(eq(accountTable.userId, userId), eq(accountTable.providerId, "credential")))
    .limit(1);

  if (credential.length) {
    await masterDb
      .update(accountTable)
      .set({
        accountId: userId,
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(accountTable.id, credential[0].id));
  } else {
    await masterDb.insert(accountTable).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { userId, passwordHash };
}

export async function markForcePasswordChange(input: {
  userId: string;
  tenantSlug?: string | null;
  reason?: string;
}) {
  const now = new Date();
  await masterDb
    .insert(passwordSecurityTable)
    .values({
      userId: input.userId,
      tenantSlug: input.tenantSlug || null,
      forcePasswordChange: true,
      temporaryPasswordIssuedAt: now,
      reason: input.reason || "temporary_password",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: passwordSecurityTable.userId,
      set: {
        tenantSlug: input.tenantSlug || null,
        forcePasswordChange: true,
        temporaryPasswordIssuedAt: now,
        reason: input.reason || "temporary_password",
        updatedAt: now,
      },
    });
}

export async function clearForcePasswordChange(userId: string) {
  const now = new Date();
  await masterDb
    .insert(passwordSecurityTable)
    .values({
      userId,
      forcePasswordChange: false,
      passwordLastChangedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: passwordSecurityTable.userId,
      set: {
        forcePasswordChange: false,
        passwordLastChangedAt: now,
        updatedAt: now,
      },
    });
}
