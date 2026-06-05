import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { leaveTable, schoolsTable } from "@/lib/db-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
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

function daysBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

function monthKey(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "Unscheduled";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner leave ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, type: schoolsTable.type, slug: schoolsTable.slug })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;

  const tenantDb = await getTenantDbBySlug(slug);
  const [staffRows, leaveRows, departmentRows] = await Promise.all([
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            s.id as staff_id,
            s.employee_id,
            s.position,
            s.status as staff_status,
            u.id as user_id,
            u.name,
            u.email,
            u.role_id,
            u.department_id,
            u.is_active,
            d.name as department_name
          from staff s
          join users u on u.id = s.user_id
          left join departments d on d.id = coalesce(u.department_id, s.department_id)
          where lower(u.role_id) not like '%student%'
            and lower(u.role_id) not like '%pupil%'
            and lower(u.role_id) not like '%learner%'
            and lower(u.role_id) not like '%parent%'
            and lower(u.role_id) not like '%guardian%'
          order by u.name asc
        `),
      "staff"
    ),
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            l.id,
            l.staff_id,
            l.leave_type,
            l.start_date,
            l.end_date,
            l.number_of_days,
            l.reason,
            l.approved_by,
            l.status,
            l.remarks,
            l.created_at,
            l.updated_at,
            coalesce(u.name, s.employee_id, l.staff_id) as staff_name,
            u.email as staff_email,
            u.role_id as staff_role,
            d.name as department_name,
            s.position as staff_position,
            approver.name as approver_name
          from leave l
          left join staff s on s.id = l.staff_id
          left join users u on u.id = s.user_id
          left join departments d on d.id = coalesce(u.department_id, s.department_id)
          left join users approver on approver.id = l.approved_by
          order by l.created_at desc
          limit 250
        `),
      "leave"
    ),
    safeRows<Row>(() => tenantDb.execute(sql`select id, name, head_id from departments order by name asc`), "departments"),
  ]);

  const staff = staffRows.map((row) => ({
    id: asString(row.staff_id),
    userId: asString(row.user_id),
    name: asString(row.name, "Staff member"),
    email: asString(row.email),
    roleId: asString(row.role_id),
    departmentId: row.department_id ? asString(row.department_id) : null,
    departmentName: asString(row.department_name, "Unassigned"),
    employeeId: asString(row.employee_id),
    position: asString(row.position, asString(row.role_id, "Staff")),
    active: row.is_active !== false && asString(row.staff_status, "active").toLowerCase() !== "inactive",
  }));

  const leave = leaveRows.map((row) => ({
    id: asString(row.id),
    staffId: asString(row.staff_id),
    staffName: asString(row.staff_name, "Staff member"),
    staffEmail: asString(row.staff_email),
    staffRole: asString(row.staff_role),
    staffPosition: asString(row.staff_position),
    departmentName: asString(row.department_name, "Unassigned"),
    leaveType: asString(row.leave_type, "annual"),
    startDate: asDate(row.start_date),
    endDate: asDate(row.end_date),
    days: asNumber(row.number_of_days),
    reason: asString(row.reason),
    approvedBy: row.approved_by ? asString(row.approved_by) : null,
    approverName: asString(row.approver_name),
    status: asString(row.status, "pending").toLowerCase(),
    remarks: asString(row.remarks),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  }));

  const byStatus = new Map<string, { name: string; value: number; days: number }>();
  const byType = new Map<string, { name: string; value: number; days: number }>();
  const byDepartment = new Map<string, { name: string; total: number; pending: number; approved: number; rejected: number; cancelled: number; days: number }>();
  const byMonth = new Map<string, { name: string; requests: number; days: number }>();

  for (const item of leave) {
    const statusCurrent = byStatus.get(item.status) || { name: item.status, value: 0, days: 0 };
    statusCurrent.value += 1;
    statusCurrent.days += item.days;
    byStatus.set(item.status, statusCurrent);

    const typeCurrent = byType.get(item.leaveType) || { name: item.leaveType, value: 0, days: 0 };
    typeCurrent.value += 1;
    typeCurrent.days += item.days;
    byType.set(item.leaveType, typeCurrent);

    const departmentCurrent = byDepartment.get(item.departmentName) || {
      name: item.departmentName,
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      days: 0,
    };
    departmentCurrent.total += 1;
    departmentCurrent.days += item.days;
    if (item.status === "pending") departmentCurrent.pending += 1;
    if (item.status === "approved") departmentCurrent.approved += 1;
    if (item.status === "rejected") departmentCurrent.rejected += 1;
    if (item.status === "cancelled") departmentCurrent.cancelled += 1;
    byDepartment.set(item.departmentName, departmentCurrent);

    const key = monthKey(item.startDate);
    const monthCurrent = byMonth.get(key) || { name: key, requests: 0, days: 0 };
    monthCurrent.requests += 1;
    monthCurrent.days += item.days;
    byMonth.set(key, monthCurrent);
  }

  const pending = leave.filter((item) => item.status === "pending");
  const approved = leave.filter((item) => item.status === "approved");
  const rejected = leave.filter((item) => item.status === "rejected");
  const cancelled = leave.filter((item) => item.status === "cancelled");
  const approvedDays = approved.reduce((sum, item) => sum + item.days, 0);
  const pendingDays = pending.reduce((sum, item) => sum + item.days, 0);

  return {
    school,
    generatedAt: new Date().toISOString(),
    staff,
    leave,
    departments: departmentRows.map((row) => ({
      id: asString(row.id),
      name: asString(row.name, "Department"),
      headId: row.head_id ? asString(row.head_id) : null,
    })),
    analytics: {
      byStatus: Array.from(byStatus.values()),
      byType: Array.from(byType.values()).sort((a, b) => b.days - a.days),
      byDepartment: Array.from(byDepartment.values()).sort((a, b) => b.total - a.total),
      byMonth: Array.from(byMonth.values()).reverse().slice(0, 8).reverse(),
    },
    summary: {
      totalRequests: leave.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      approvedDays,
      pendingDays,
      approvalRate: leave.length ? Math.round((approved.length / leave.length) * 1000) / 10 : 0,
      activeStaff: staff.filter((member) => member.active).length,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const payload = await buildPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Owner leave GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner leave data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const staffId = asString(body.staffId);
    const leaveType = asString(body.leaveType, "annual").toLowerCase();
    const startDate = asString(body.startDate);
    const endDate = asString(body.endDate);
    const reason = asString(body.reason);
    const status = asString(body.status, "pending").toLowerCase();
    const remarks = asString(body.remarks);

    if (!staffId || !startDate || !endDate) {
      return NextResponse.json({ error: "Staff member, start date, and end date are required" }, { status: 400 });
    }
    if (!["annual", "sick", "maternity", "paternity", "compassionate", "study", "unpaid", "other"].includes(leaveType)) {
      return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
    }
    if (!["pending", "approved"].includes(status)) {
      return NextResponse.json({ error: "New owner leave records can only be pending or approved" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "A valid start and end date range is required" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb.insert(leaveTable).values({
      id: crypto.randomUUID(),
      staffId,
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays: String(daysBetween(startDate, endDate)),
      reason: reason || null,
      status,
      remarks: remarks || null,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Leave record created" }, { status: 201 });
  } catch (error) {
    console.error("Owner leave POST failed:", error);
    return NextResponse.json({ error: "Failed to create leave record" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const id = asString(body.id);
    const status = asString(body.status).toLowerCase();
    const remarks = body.remarks === undefined ? undefined : asString(body.remarks);
    if (!id || !["pending", "approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Valid leave id and status are required" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb
      .update(leaveTable)
      .set({ status, remarks, updatedAt: new Date() })
      .where(eq(leaveTable.id, id));

    return NextResponse.json({ success: true, message: "Leave status updated" });
  } catch (error) {
    console.error("Owner leave PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
  }
}
