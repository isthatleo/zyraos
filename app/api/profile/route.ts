import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

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

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  await ensureProfileTable();
  await db.execute(sql`
    insert into user_profiles (id, user_id, timezone, language, preferred_contact_method, created_at, updated_at)
    values (${newId("profile")}, ${currentUser.id}, 'Africa/Kampala', 'English', 'in_app', now(), now())
    on conflict (user_id) do nothing
  `);

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
    where user_id = ${currentUser.id}
    limit 1
  `);

  return NextResponse.json({ profile: result.rows[0] || {}, currentUser }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  await ensureProfileTable();
  const body = await request.json().catch(() => ({}));
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
      ${currentUser.id},
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

  return GET(request);
}
