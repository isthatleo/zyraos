import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userTable } from "@/lib/db-schema";

export type DashboardDbUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

export async function getRequiredDashboardUser(headers: Headers): Promise<DashboardDbUser | NextResponse> {
  const session = await auth.api.getSession({ headers }).catch(() => null);

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [authUser] = await db
    .select({ role: userTable.role, name: userTable.name, image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1)
    .catch(() => []);

  const role = String(authUser?.role || (session.user as { role?: string }).role || "").trim();
  if (!role || role === "user") {
    return NextResponse.json({ error: "Authenticated user role is not configured" }, { status: 403 });
  }

  const name = session.user.name || session.user.email;
  const image = session.user.image || authUser?.image || null;

  if (role === "super_admin") {
    return {
      id: session.user.id,
      name: authUser?.name || name,
      email: session.user.email,
      role,
      image,
    };
  }

  await db.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values (${role}, ${role.replace(/_/g, " ")}, ${"Auto-created role for authenticated users"}, true, now(), now())
    on conflict (id) do nothing
  `);

  await db.execute(sql`
    insert into users (id, email, email_verified, name, image, role_id, is_active, created_at, updated_at)
    values (${session.user.id}, ${session.user.email}, true, ${name}, ${image}, ${role}, true, now(), now())
    on conflict (id) do update set
      email = excluded.email,
      name = excluded.name,
      image = excluded.image,
      role_id = excluded.role_id,
      updated_at = now()
  `);

  return {
    id: session.user.id,
    name,
    email: session.user.email,
    role,
    image,
  };
}

export function isNextResponse(value: DashboardDbUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
