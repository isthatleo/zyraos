import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BrandingValue = {
  name?: string | null;
  logoUrl?: string | null;
};

function fallbackName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "School";
}

async function getSchool(slug: string) {
  const result = await db.execute(sql`
    select id, name, slug
    from schools
    where slug = ${slug}
    limit 1
  `);
  return result.rows[0] as { id: string; name: string; slug: string } | undefined;
}

async function getBrandingValue(slug: string) {
  const result = await db.execute(sql`
    select value
    from system_settings
    where key = ${`tenant_branding:${slug}`}
    limit 1
  `);
  return (result.rows[0] as { value?: BrandingValue } | undefined)?.value || {};
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const school = await getSchool(slug);
  const branding = await getBrandingValue(slug);
  const defaultName = school?.name || fallbackName(slug);
  const name = branding.name || defaultName;
  const logoUrl = branding.logoUrl || null;

  return NextResponse.json(
    {
      slug,
      schoolId: school?.id || null,
      defaultName,
      name,
      logoUrl,
      isDefault: name === defaultName && !logoUrl,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const school = await getSchool(slug);
  const defaultName = school?.name || fallbackName(slug);
  const nextValue: BrandingValue = {
    name: String(body.name || defaultName).trim() || defaultName,
    logoUrl: body.logoUrl ? String(body.logoUrl) : null,
  };

  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (
      ${crypto.randomUUID()},
      ${`tenant_branding:${slug}`},
      ${JSON.stringify(nextValue)}::jsonb,
      'branding',
      ${`Tenant branding for ${slug}`},
      now(),
      now()
    )
    on conflict (key) do update set
      value = excluded.value,
      updated_at = now()
  `);

  return NextResponse.json({
    slug,
    defaultName,
    name: nextValue.name,
    logoUrl: nextValue.logoUrl,
    isDefault: nextValue.name === defaultName && !nextValue.logoUrl,
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  await db.execute(sql`delete from system_settings where key = ${`tenant_branding:${slug}`}`);

  const school = await getSchool(slug);
  const defaultName = school?.name || fallbackName(slug);

  return NextResponse.json({
    slug,
    defaultName,
    name: defaultName,
    logoUrl: null,
    isDefault: true,
  });
}
