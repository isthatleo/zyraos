import { createTenantAuth } from "@/lib/tenant-auth";
import { getTenantDbBySlug } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = 'nodejs'; // Add this line to force Node.js runtime

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get('tenant');

  if (!tenantSlug) {
    return new Response(JSON.stringify({ error: 'Tenant slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const school = await getTenantDbBySlug(tenantSlug);
    // getTenantDbBySlug returns the db, but we need the databaseUrl
    // Let's modify this to get the school info first
    const { masterDb } = await import('@/lib/db');
    const { schoolsTable } = await import('@/lib/db-schema');
    const { eq } = await import('drizzle-orm');

    const schoolInfo = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, tenantSlug))
      .limit(1);

    if (!schoolInfo.length) {
      return new Response(JSON.stringify({ error: 'School not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const auth = createTenantAuth(schoolInfo[0].databaseUrl);

    // Handle the auth request
    const response = await auth.handler(request);
    return response;
  } catch (error) {
    console.error('Tenant auth error:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get('tenant');

  if (!tenantSlug) {
    return new Response(JSON.stringify({ error: 'Tenant slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { masterDb } = await import('@/lib/db');
    const { schoolsTable } = await import('@/lib/db-schema');
    const { eq } = await import('drizzle-orm');

    const schoolInfo = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, tenantSlug))
      .limit(1);

    if (!schoolInfo.length) {
      return new Response(JSON.stringify({ error: 'School not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const auth = createTenantAuth(schoolInfo[0].databaseUrl);

    // Handle the auth request
    const response = await auth.handler(request);
    return response;
  } catch (error) {
    console.error('Tenant auth error:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
