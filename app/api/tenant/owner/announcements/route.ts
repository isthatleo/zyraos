import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const AUDIENCE_ROLES: Record<string, string[]> = {
  all_staff: ["owner", "school_admin", "admin", "teacher", "lecturer", "professor", "accountant", "finance", "librarian", "hr", "canteen", "registrar", "admissions_officer", "exam_officer", "department_head", "class_teacher", "nurse", "transport_manager", "hostel_warden", "security", "procurement", "inventory_manager", "counselor"],
  school_leadership: ["owner", "school_admin", "admin", "registrar", "department_head"],
  academic_staff: ["teacher", "lecturer", "professor", "class_teacher", "department_head", "exam_officer"],
  finance_hr: ["accountant", "finance", "hr"],
  support_staff: ["librarian", "canteen", "nurse", "transport_manager", "hostel_warden", "security", "procurement", "inventory_manager", "counselor"],
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner announcements ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function normalizeAudience(value: unknown) {
  const audience = asString(value, "all_staff");
  return AUDIENCE_ROLES[audience] ? audience : "all_staff";
}

function normalizeTargetRoles(value: unknown) {
  const audience = normalizeAudience(value);
  return AUDIENCE_ROLES[audience];
}

function statusFor(row: Row) {
  const published = row.is_published === true;
  const publishDate = row.publish_date ? new Date(String(row.publish_date)) : null;
  const expiryDate = row.expiry_date ? new Date(String(row.expiry_date)) : null;
  const now = Date.now();
  if (!published) return "draft";
  if (expiryDate && expiryDate.getTime() < now) return "expired";
  if (publishDate && publishDate.getTime() > now) return "scheduled";
  return "published";
}

function audienceFromRoles(value: unknown) {
  const roles = Array.isArray(value) ? value.map(String).sort() : [];
  for (const [audience, audienceRoles] of Object.entries(AUDIENCE_ROLES)) {
    if (JSON.stringify([...audienceRoles].sort()) === JSON.stringify(roles)) return audience;
  }
  return "custom";
}

async function ensureTenantUser(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, user: { id: string; email: string; name: string; role: string; image?: string | null }) {
  await tenantDb.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values (${user.role}, ${user.role.replace(/_/g, " ")}, ${"Auto-created role for owner announcements"}, true, now(), now())
    on conflict (id) do nothing
  `);
  await tenantDb.execute(sql`
    insert into users (id, email, email_verified, name, image, role_id, is_active, created_at, updated_at)
    values (${user.id}, ${user.email}, true, ${user.name}, ${user.image || null}, ${user.role}, true, now(), now())
    on conflict (id) do update set name = excluded.name, image = excluded.image, role_id = excluded.role_id, updated_at = now()
  `);
}

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);

  const [announcementRows, recipientRows] = await Promise.all([
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            a.id,
            a.title,
            a.content,
            a.author_id,
            a.target_roles,
            a.is_published,
            a.publish_date,
            a.expiry_date,
            a.created_at,
            a.updated_at,
            u.name as author_name,
            u.email as author_email,
            u.role_id as author_role
          from announcements a
          left join users u on u.id = a.author_id
          where u.role_id = 'owner' or a.target_roles ?| ${AUDIENCE_ROLES.all_staff}
          order by a.created_at desc
          limit 200
        `),
      "announcements"
    ),
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select role_id, count(*)::int total
          from users
          where is_active = true
            and role_id <> all(${["student", "pupil", "learner", "parent", "guardian"]}::text[])
          group by role_id
          order by total desc
        `),
      "recipient summary"
    ),
  ]);

  const announcements = announcementRows.map((row) => {
    const targetRoles = Array.isArray(row.target_roles) ? row.target_roles.map(String) : [];
    return {
      id: asString(row.id),
      title: asString(row.title),
      content: asString(row.content),
      authorId: asString(row.author_id),
      authorName: asString(row.author_name, "Owner"),
      authorEmail: asString(row.author_email),
      authorRole: asString(row.author_role),
      targetRoles,
      audience: audienceFromRoles(targetRoles),
      isPublished: row.is_published === true,
      status: statusFor(row),
      publishDate: asDate(row.publish_date),
      expiryDate: asDate(row.expiry_date),
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at),
    };
  });

  return {
    school,
    generatedAt: new Date().toISOString(),
    announcements,
    recipientSummary: recipientRows.map((row) => ({ role: asString(row.role_id), total: asNumber(row.total) })),
    summary: {
      total: announcements.length,
      published: announcements.filter((item) => item.status === "published").length,
      scheduled: announcements.filter((item) => item.status === "scheduled").length,
      draft: announcements.filter((item) => item.status === "draft").length,
      expired: announcements.filter((item) => item.status === "expired").length,
      recipients: recipientRows.reduce((sum, row) => sum + asNumber(row.total), 0),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const payload = await buildPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner announcements GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner announcements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getRequiredDashboardUser(request.headers);
    if (isNextResponse(currentUser)) return currentUser;
    if (currentUser.role !== "owner") return NextResponse.json({ error: "Only owners can create announcements" }, { status: 403 });

    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Row;
    const title = asString(body.title).slice(0, 180);
    const content = asString(body.content).slice(0, 8000);
    const targetRoles = normalizeTargetRoles(body.audience);
    const publishMode = asString(body.publishMode, "publish");
    const publishDate = asString(body.publishDate);
    const expiryDate = asString(body.expiryDate);
    const isPublished = publishMode !== "draft";

    if (!title || !content) return NextResponse.json({ error: "Title and content are required" }, { status: 400 });

    const tenantDb = await getTenantDbBySlug(slug);
    await ensureTenantUser(tenantDb, currentUser);
    await tenantDb.execute(sql`
      insert into announcements (id, title, content, author_id, target_roles, is_published, publish_date, expiry_date, created_at, updated_at)
      values (
        ${crypto.randomUUID()},
        ${title},
        ${content},
        ${currentUser.id},
        ${JSON.stringify(targetRoles)}::jsonb,
        ${isPublished},
        ${publishDate ? new Date(publishDate) : isPublished ? new Date() : null},
        ${expiryDate ? new Date(expiryDate) : null},
        now(),
        now()
      )
    `);

    return NextResponse.json(await buildPayload(slug), { status: 201 });
  } catch (error) {
    console.error("Owner announcements POST failed:", error);
    return NextResponse.json({ error: "Failed to create owner announcement" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getRequiredDashboardUser(request.headers);
    if (isNextResponse(currentUser)) return currentUser;
    if (currentUser.role !== "owner") return NextResponse.json({ error: "Only owners can update announcements" }, { status: 403 });

    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as Row;
    const announcementId = asString(body.id);
    const action = asString(body.action, "update");
    if (!announcementId) return NextResponse.json({ error: "Announcement id is required" }, { status: 400 });

    const tenantDb = await getTenantDbBySlug(slug);
    await ensureTenantUser(tenantDb, currentUser);

    if (action === "publish") {
      await tenantDb.execute(sql`update announcements set is_published = true, publish_date = coalesce(publish_date, now()), updated_at = now() where id = ${announcementId}`);
    } else if (action === "draft") {
      await tenantDb.execute(sql`update announcements set is_published = false, updated_at = now() where id = ${announcementId}`);
    } else if (action === "expire") {
      await tenantDb.execute(sql`update announcements set expiry_date = now(), updated_at = now() where id = ${announcementId}`);
    } else {
      const title = asString(body.title).slice(0, 180);
      const content = asString(body.content).slice(0, 8000);
      if (!title || !content) return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
      await tenantDb.execute(sql`
        update announcements
        set title = ${title},
            content = ${content},
            target_roles = ${JSON.stringify(normalizeTargetRoles(body.audience))}::jsonb,
            publish_date = ${asString(body.publishDate) ? new Date(asString(body.publishDate)) : null},
            expiry_date = ${asString(body.expiryDate) ? new Date(asString(body.expiryDate)) : null},
            updated_at = now()
        where id = ${announcementId}
      `);
    }

    return NextResponse.json(await buildPayload(slug));
  } catch (error) {
    console.error("Owner announcements PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update owner announcement" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getRequiredDashboardUser(request.headers);
    if (isNextResponse(currentUser)) return currentUser;
    if (currentUser.role !== "owner") return NextResponse.json({ error: "Only owners can delete announcements" }, { status: 403 });
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const id = request.nextUrl.searchParams.get("id")?.trim();
    if (!slug || !id) return NextResponse.json({ error: "Tenant slug and announcement id are required" }, { status: 400 });
    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb.execute(sql`delete from announcements where id = ${id}`);
    return NextResponse.json(await buildPayload(slug));
  } catch (error) {
    console.error("Owner announcements DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete owner announcement" }, { status: 500 });
  }
}
