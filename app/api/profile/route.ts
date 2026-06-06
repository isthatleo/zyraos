import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db, getTenantDbBySlug } from "@/lib/db";
import { getCurrentMasterAdmin, writeMasterAudit } from "@/lib/master-audit";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensureProfileTable() {
  await db.execute(sql`
    create table if not exists user_profiles (
      id text primary key,
      user_id text not null unique references "user"(id) on delete cascade,
      phone text,
      alternate_email text,
      job_title text,
      department text,
      employee_code text,
      admission_number text,
      guardian_contact text,
      campus text,
      address text,
      city text,
      country text,
      timezone text,
      language text,
      bio text,
      emergency_contact_name text,
      emergency_contact_phone text,
      preferred_contact_method text,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);
}

function clean(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function cleanImage(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.startsWith("data:image/") || text.startsWith("https://") || text.startsWith("http://") || text.startsWith("/")) {
    return text;
  }
  return null;
}

function validateProfileInput(body: Record<string, unknown>) {
  const name = clean(body.name);
  const alternateEmail = clean(body.alternateEmail);
  const bio = clean(body.bio);
  const image = Object.prototype.hasOwnProperty.call(body, "image") ? cleanImage(body.image) : undefined;

  if (name && name.length > 120) return "Name cannot exceed 120 characters";
  if (alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail)) return "Alternate email must be valid";
  if (bio && bio.length > 1200) return "Bio cannot exceed 1200 characters";
  if (Object.prototype.hasOwnProperty.call(body, "image") && clean(body.image) && !image) return "Avatar must be a data image, HTTP(S) URL, or site path";
  return null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function mergeProfile(existing: Record<string, unknown>, fallback: Record<string, unknown>) {
  const next = { ...existing };
  for (const [key, value] of Object.entries(fallback)) {
    if (!firstText(next[key]) && firstText(value)) next[key] = value;
  }
  return next;
}

function tenantSlugFromRequest(request: NextRequest) {
  const direct = request.nextUrl.searchParams.get("tenant");
  if (direct) return direct;

  const host = request.headers.get("host") || "";
  const subdomain = getTenantSubdomain(host);
  if (subdomain) return subdomain;

  const referrer = request.headers.get("referer") || request.headers.get("referrer") || "";
  try {
    const url = referrer ? new URL(referrer) : null;
    return resolveTenantSlug(url?.pathname, url?.host);
  } catch {
    return null;
  }
}

async function ensureMasterProfile(masterAdmin: { userId: string }) {
  await ensureProfileTable();
  await db.execute(sql`
    insert into user_profiles (id, user_id, timezone, language, preferred_contact_method, created_at, updated_at)
    values (${newId("profile")}, ${masterAdmin.userId}, 'Africa/Kampala', 'English', 'in_app', now(), now())
    on conflict (user_id) do nothing
  `);
}

async function loadProfile(userId: string) {
  const result = await db.execute(sql`
    select
      phone,
      alternate_email as "alternateEmail",
      job_title as "jobTitle",
      department,
      employee_code as "employeeCode",
      admission_number as "admissionNumber",
      guardian_contact as "guardianContact",
      campus,
      address,
      city,
      country,
      timezone,
      language,
      bio,
      emergency_contact_name as "emergencyContactName",
      emergency_contact_phone as "emergencyContactPhone",
      preferred_contact_method as "preferredContactMethod"
    from user_profiles
    where user_id = ${userId}
    limit 1
  `);
  return result.rows[0] || {};
}

async function loadTenantProfileFallback(request: NextRequest, userId: string, email: string) {
  const tenantSlug = tenantSlugFromRequest(request);
  if (!tenantSlug) return {};

  try {
    const tenantDb = await getTenantDbBySlug(tenantSlug);
    const result = await tenantDb.execute(sql`
      select
        u.name,
        u.email,
        u.role_id,
        r.name as role_name,
        d.name as user_department_name,
        st.employee_id,
        st.position,
        sd.name as staff_department_name,
        s.admission_number,
        s.phone as student_phone,
        s.address as student_address,
        s.emergency_contact,
        c.name as class_name,
        c.grade as class_grade,
        c.section as class_section
      from users u
      left join roles r on r.id = u.role_id
      left join departments d on d.id = u.department_id
      left join staff st on st.user_id = u.id
      left join departments sd on sd.id = st.department_id
      left join students s on s.user_id = u.id
      left join classes c on c.id = s.class_id
      where u.id = ${userId} or lower(u.email) = lower(${email})
      limit 1
    `);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return {};

    const roleLabel = firstText(row.position, row.role_name, row.role_id);
    const classLabel = firstText(
      row.class_name,
      [row.class_grade, row.class_section].map((value) => String(value || "").trim()).filter(Boolean).join(" ")
    );

    return {
      phone: row.student_phone,
      jobTitle: roleLabel,
      department: firstText(row.staff_department_name, row.user_department_name, classLabel),
      employeeCode: row.employee_id,
      admissionNumber: row.admission_number,
      guardianContact: row.emergency_contact,
      address: row.student_address,
      campus: tenantSlug,
      emergencyContactPhone: row.emergency_contact,
    };
  } catch (error) {
    console.warn("[profile] Failed to load tenant profile fallback", error);
    return {};
  }
}

async function upsertProfile(userId: string, body: Record<string, unknown>) {
  await db.execute(sql`
    insert into user_profiles (
      id,
      user_id,
      phone,
      alternate_email,
      job_title,
      department,
      employee_code,
      admission_number,
      guardian_contact,
      campus,
      address,
      city,
      country,
      timezone,
      language,
      bio,
      emergency_contact_name,
      emergency_contact_phone,
      preferred_contact_method,
      created_at,
      updated_at
    )
    values (
      ${newId("profile")},
      ${userId},
      ${clean(body.phone)},
      ${clean(body.alternateEmail)},
      ${clean(body.jobTitle)},
      ${clean(body.department)},
      ${clean(body.employeeCode)},
      ${clean(body.admissionNumber)},
      ${clean(body.guardianContact)},
      ${clean(body.campus)},
      ${clean(body.address)},
      ${clean(body.city)},
      ${clean(body.country)},
      ${clean(body.timezone) || "Africa/Kampala"},
      ${clean(body.language) || "English"},
      ${clean(body.bio)},
      ${clean(body.emergencyContactName)},
      ${clean(body.emergencyContactPhone)},
      ${clean(body.preferredContactMethod) || "in_app"},
      now(),
      now()
    )
    on conflict (user_id) do update set
      phone = excluded.phone,
      alternate_email = excluded.alternate_email,
      job_title = excluded.job_title,
      department = excluded.department,
      employee_code = excluded.employee_code,
      admission_number = excluded.admission_number,
      guardian_contact = excluded.guardian_contact,
      campus = excluded.campus,
      address = excluded.address,
      city = excluded.city,
      country = excluded.country,
      timezone = excluded.timezone,
      language = excluded.language,
      bio = excluded.bio,
      emergency_contact_name = excluded.emergency_contact_name,
      emergency_contact_phone = excluded.emergency_contact_phone,
      preferred_contact_method = excluded.preferred_contact_method,
      updated_at = now()
  `);
}

export async function GET(request: NextRequest) {
  const masterAdmin = await getCurrentMasterAdmin(request);
  if (masterAdmin) {
    await ensureMasterProfile(masterAdmin);
    const userRows = await db.execute(sql`select image from "user" where id = ${masterAdmin.userId} limit 1`);
    const image = (userRows.rows[0] as { image?: string | null } | undefined)?.image || null;
    return NextResponse.json({
      profile: await loadProfile(masterAdmin.userId),
      currentUser: {
        id: masterAdmin.userId,
        name: masterAdmin.name,
        email: masterAdmin.email,
        role: "super_admin",
        image,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  await ensureProfileTable();
  await db.execute(sql`
    insert into user_profiles (id, user_id, timezone, language, preferred_contact_method, created_at, updated_at)
    values (${newId("profile")}, ${currentUser.id}, 'Africa/Kampala', 'English', 'in_app', now(), now())
    on conflict (user_id) do nothing
  `);

  const profile = mergeProfile(
    await loadProfile(currentUser.id),
    await loadTenantProfileFallback(request, currentUser.id, currentUser.email)
  );

  return NextResponse.json({ profile, currentUser }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const masterAdmin = await getCurrentMasterAdmin(request);
  if (masterAdmin) {
    await ensureMasterProfile(masterAdmin);
    const body = await request.json().catch(() => ({}));
    const validationError = validateProfileInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const nextName = clean(body.name);
    const hasImageUpdate = Object.prototype.hasOwnProperty.call(body, "image");
    const nextImage = cleanImage(body.image);

    if (nextName || hasImageUpdate) {
      await db.execute(sql`
        update "user"
        set
          name = coalesce(${nextName}, name),
          image = case when ${hasImageUpdate} then ${nextImage} else image end,
          "updatedAt" = now()
        where id = ${masterAdmin.userId}
      `);
      await db.execute(sql`
        update platform_admins
        set name = coalesce(${nextName}, name), updated_at = now()
        where id = ${masterAdmin.adminId} or email = ${masterAdmin.email}
      `);
    }
    await upsertProfile(masterAdmin.userId, body);
    await writeMasterAudit(request, {
      adminId: masterAdmin.adminId,
      action: "Master Profile Updated",
      resource: "profile",
      resourceId: masterAdmin.userId,
      changes: { fields: Object.keys(body).filter((key) => key !== "image"), imageUpdated: hasImageUpdate },
    });
    return GET(request);
  }

  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  await ensureProfileTable();
  const body = await request.json().catch(() => ({}));
  const validationError = validateProfileInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const nextName = clean(body.name);
  const hasImageUpdate = Object.prototype.hasOwnProperty.call(body, "image");
  const nextImage = cleanImage(body.image);

  if (nextName || hasImageUpdate) {
    await db.execute(sql`
      update "user"
      set
        name = coalesce(${nextName}, name),
        image = case when ${hasImageUpdate} then ${nextImage} else image end,
        "updatedAt" = now()
      where id = ${currentUser.id}
    `);
  }

  await upsertProfile(currentUser.id, body);

  return GET(request);
}
