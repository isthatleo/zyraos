import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug } from "@/lib/db";
import { getSmsProviderStatus, sendPlatformSms } from "@/lib/platform-integrations";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asPositiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value || fallback);
  if (!Number.isFinite(next) || next < 1) return fallback;
  return Math.min(Math.floor(next), max);
}

function isValidDateInput(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: Row[]) {
  const headers = ["id", "broadcastId", "title", "recipientName", "role", "phone", "status", "error", "externalReference", "createdAt", "deliveredAt", "failedAt", "smsCount", "costEstimate"];
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin SMS reports ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

function smsCount(content: string) {
  return Math.max(1, Math.ceil(content.length / 160));
}

function normalizeDelivery(row: Row) {
  const content = asString(row.content);
  const count = smsCount(content);
  return {
    id: asString(row.id),
    broadcastId: asString(row.broadcast_id),
    title: asString(row.title, "Broadcast"),
    content,
    recipientName: asString(row.user_name, asString(row.email, "Recipient")),
    recipientEmail: asString(row.email),
    role: asString(row.role_id),
    phone: asString(row.phone),
    status: asString(row.status, "pending"),
    error: asString(row.delivery_error),
    externalReference: asString(row.external_reference),
    createdAt: asDate(row.created_at),
    deliveredAt: asDate(row.delivered_at),
    failedAt: asDate(row.failed_at),
    smsCount: count,
    costEstimate: Number((count * 0.05).toFixed(2)),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  };
}

async function buildPayload(request: NextRequest, slug: string) {
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const params = request.nextUrl.searchParams;
  const page = asPositiveInt(params.get("page"), 1, 10_000);
  const pageSize = asPositiveInt(params.get("pageSize"), 25, 100);
  const offset = (page - 1) * pageSize;
  const query = params.get("query")?.trim() || "";
  const status = params.get("status")?.trim().toLowerCase() || "all";
  const role = params.get("role")?.trim().toLowerCase() || "all";
  const startDate = params.get("startDate")?.trim() || "";
  const endDate = params.get("endDate")?.trim() || "";
  const exportFormat = params.get("export")?.trim().toLowerCase() || "";
  if (!["", "csv", "json"].includes(exportFormat)) return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) return NextResponse.json({ error: "Dates must use YYYY-MM-DD format" }, { status: 400 });
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) return NextResponse.json({ error: "Start date cannot be after end date" }, { status: 400 });

  const whereParts = [sql`lower(coalesce(b.channel, '')) = 'sms'`];
  if (query) {
    const pattern = `%${query}%`;
    whereParts.push(sql`(
      b.title ilike ${pattern}
      or b.content ilike ${pattern}
      or coalesce(u.name, '') ilike ${pattern}
      or coalesce(u.email, '') ilike ${pattern}
      or coalesce(d.phone, '') ilike ${pattern}
      or coalesce(d.external_reference, '') ilike ${pattern}
      or coalesce(d.delivery_error, '') ilike ${pattern}
    )`);
  }
  if (status !== "all") whereParts.push(sql`lower(d.status) = ${status}`);
  if (role !== "all") whereParts.push(sql`lower(coalesce(u.role_id, '')) = ${role}`);
  if (startDate) whereParts.push(sql`d.created_at >= ${new Date(startDate)}`);
  if (endDate) whereParts.push(sql`d.created_at <= ${new Date(`${endDate}T23:59:59.999Z`)}`);
  const whereSql = sql.join(whereParts, sql` and `);
  const limitSql = exportFormat ? sql`limit 5000` : sql`limit ${pageSize} offset ${offset}`;

  const [deliveryRows, countRows, summaryRows, roleRows, provider] = await Promise.all([
    safeRows<Row>(() => tenantDb.execute(sql`
      select d.*, b.title, b.content, b.channel, u.name as user_name, u.role_id
      from broadcast_deliveries d
      join broadcasts b on b.id = d.broadcast_id
      left join users u on u.id = d.user_id
      where ${whereSql}
      order by d.created_at desc
      ${limitSql}
    `), "deliveries"),
    safeRows<Row>(() => tenantDb.execute(sql`
      select count(*)::int total
      from broadcast_deliveries d
      join broadcasts b on b.id = d.broadcast_id
      left join users u on u.id = d.user_id
      where ${whereSql}
    `), "count"),
    safeRows<Row>(() => tenantDb.execute(sql`
      select count(*)::int total,
        count(*) filter (where lower(d.status) in ('sent', 'delivered'))::int sent,
        count(*) filter (where lower(d.status) = 'delivered')::int delivered,
        count(*) filter (where lower(d.status) = 'pending')::int pending,
        count(*) filter (where lower(d.status) in ('failed', 'bounced'))::int failed,
        count(*) filter (where coalesce(d.phone, '') = '')::int missing_phone
      from broadcast_deliveries d
      join broadcasts b on b.id = d.broadcast_id
      left join users u on u.id = d.user_id
      where ${whereSql}
    `), "summary"),
    safeRows<Row>(() => tenantDb.execute(sql`
      select coalesce(u.role_id, 'unknown') role, count(*)::int total
      from broadcast_deliveries d
      join broadcasts b on b.id = d.broadcast_id
      left join users u on u.id = d.user_id
      where ${whereSql}
      group by role
      order by total desc
    `), "roles"),
    getSmsProviderStatus().catch((error) => ({ ok: false, provider: "sms", status: "failed", message: error instanceof Error ? error.message : "SMS provider check failed", checkedAt: new Date().toISOString() })),
  ]);

  const deliveries = deliveryRows.map(normalizeDelivery);
  const total = asNumber(countRows[0]?.total);
  const summary = summaryRows[0] || {};
  const payload = {
    deliveries,
    summaries: {
      total,
      sent: asNumber(summary.sent),
      delivered: asNumber(summary.delivered),
      pending: asNumber(summary.pending),
      failed: asNumber(summary.failed),
      missingPhone: asNumber(summary.missing_phone),
      estimatedCost: Number(deliveries.reduce((sum, item) => sum + item.costEstimate, 0).toFixed(2)),
    },
    analytics: {
      byRole: roleRows.map((row) => ({ name: asString(row.role, "unknown"), total: asNumber(row.total) })),
    },
    provider,
    filters: { query, status, role, startDate, endDate },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
    generatedAt: new Date().toISOString(),
  };

  if (exportFormat === "json") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.sms_reports.exported", resource: "sms_reports", resourceId: slug, changes: { format: "json", filters: payload.filters, rowCount: deliveries.length } }).catch(() => undefined);
    return NextResponse.json({ ...payload, exportedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-sms-reports.json"` } });
  }
  if (exportFormat === "csv") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.sms_reports.exported", resource: "sms_reports", resourceId: slug, changes: { format: "csv", filters: payload.filters, rowCount: deliveries.length } }).catch(() => undefined);
    return new NextResponse(rowsToCsv(deliveries as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-sms-reports.csv"` } });
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  return buildPayload(request, slug);
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const body = await request.json().catch(() => ({}));
  const action = asString(body.action);

  if (action === "provider_status") {
    const provider = await getSmsProviderStatus().catch((error) => ({ ok: false, provider: "sms", status: "failed", message: error instanceof Error ? error.message : "SMS provider check failed", checkedAt: new Date().toISOString() }));
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.sms_reports.provider_checked", resource: "sms_reports", resourceId: slug, changes: provider }).catch(() => undefined);
    return NextResponse.json({ success: true, provider }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (action === "reconcile") {
    const staleRows = await safeRows<Row>(() => tenantDb.execute(sql`
      update broadcast_deliveries d
      set status = 'failed', delivery_error = 'Missing phone number for SMS delivery', failed_at = coalesce(failed_at, now()), updated_at = now()
      from broadcasts b
      where b.id = d.broadcast_id
        and lower(b.channel) = 'sms'
        and lower(d.status) in ('pending', 'failed')
        and coalesce(d.phone, '') = ''
      returning d.id
    `), "reconcile missing phones");
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.sms_reports.reconciled", resource: "sms_reports", resourceId: slug, changes: { missingPhoneMarkedFailed: staleRows.length } }).catch(() => undefined);
    return NextResponse.json({ success: true, reconciled: staleRows.length }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (action === "retry") {
    const deliveryId = asString(body.deliveryId);
    if (!deliveryId) return NextResponse.json({ error: "Delivery ID is required" }, { status: 400 });
    const [delivery] = await safeRows<Row>(() => tenantDb.execute(sql`
      select d.*, b.content, b.title
      from broadcast_deliveries d
      join broadcasts b on b.id = d.broadcast_id
      where d.id = ${deliveryId} and lower(b.channel) = 'sms'
      limit 1
    `), "retry delivery");
    if (!delivery) return NextResponse.json({ error: "SMS delivery not found" }, { status: 404 });
    const phone = asString(delivery.phone);
    const content = asString(delivery.content);
    if (!phone) return NextResponse.json({ error: "Cannot retry SMS without a phone number" }, { status: 400 });
    const result = await sendPlatformSms({ to: phone, body: content });
    await tenantDb.execute(sql`
      update broadcast_deliveries
      set status = ${result.ok ? "sent" : "failed"},
        delivery_error = ${result.ok ? null : result.message},
        external_reference = ${asString((result.data as Row | undefined)?.sid) || null},
        delivered_at = ${result.ok ? new Date() : null},
        failed_at = ${result.ok ? null : new Date()},
        metadata = coalesce(metadata, '{}'::jsonb) || ${JSON.stringify({ retry: true, provider: result.provider, checkedAt: result.checkedAt })}::jsonb,
        updated_at = now()
      where id = ${deliveryId}
    `);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.sms_reports.retry", resource: "sms_reports", resourceId: deliveryId, changes: { result } }).catch(() => undefined);
    return NextResponse.json({ success: result.ok, result }, { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  return NextResponse.json({ error: "Unsupported SMS report action" }, { status: 400 });
}
