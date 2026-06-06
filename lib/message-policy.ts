import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export type MessagingPolicyUser = { id: string; role: string };

const platformAdminRoles = ["master", "super_admin"];
const platformAllowedMessageRoles = ["owner", "school_admin", "admin"];
const ownerAllowedMessageRoles = ["master", "super_admin", "school_admin", "admin"];

export function isPlatformMessagingAdmin(role: string) {
  return platformAdminRoles.includes(role);
}

export async function canDashboardUserMessage(currentUser: MessagingPolicyUser, otherUserId: string) {
  if (!isPlatformMessagingAdmin(currentUser.role) && currentUser.role !== "owner") return true;
  const result = await db.execute(sql`
    select role_id as role
    from users
    where id = ${otherUserId}
      and is_active = true
    limit 1
  `).catch(() => ({ rows: [] as unknown[] }));
  let role = (result.rows[0] as { role?: string } | undefined)?.role;
  if (!role) {
    const authResult = await db.execute(sql`
      select role
      from "user"
      where id = ${otherUserId}
      limit 1
    `).catch(() => ({ rows: [] as unknown[] }));
    role = (authResult.rows[0] as { role?: string } | undefined)?.role;
  }
  if (!role) return false;
  if (isPlatformMessagingAdmin(currentUser.role)) return platformAllowedMessageRoles.includes(role);
  return ownerAllowedMessageRoles.includes(role);
}

export function allowedMessagingRolesFor(role: string) {
  if (isPlatformMessagingAdmin(role)) return platformAllowedMessageRoles;
  if (role === "owner") return ownerAllowedMessageRoles;
  return [];
}
