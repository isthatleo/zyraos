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

function isTodayBetween(start: unknown, end: unknown) {
  if (!start || !end) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(String(start));
  const endDate = new Date(String(end));
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return startDate <= today && today <= endDate;
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner staff attendance ${label} query skipped:`, error instanceof Error ? error.message : error);
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

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const tenantDb = await getTenantDbBySlug(slug);
    const [staffRows, leaveRows, departmentRows] = await Promise.all([
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              u.id,
              u.name,
              u.email,
              u.role_id,
              u.department_id,
              u.is_active,
              d.name as department_name,
              s.id as staff_id,
              s.employee_id,
              s.position,
              s.status as staff_status,
              s.hire_date
            from users u
            left join departments d on d.id = u.department_id
            left join staff s on s.user_id = u.id
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
              l.status,
              l.remarks,
              l.created_at,
              coalesce(u.name, s.employee_id, l.staff_id) as staff_name,
              u.email as staff_email,
              s.position as staff_position,
              s.user_id as user_id
            from leave l
            left join staff s on s.id = l.staff_id
            left join users u on u.id = s.user_id
            order by l.created_at desc
            limit 100
          `),
        "leave"
      ),
      safeRows<Row>(() => tenantDb.execute(sql`select id, name, head_id from departments order by name asc`), "departments"),
    ]);

    const activeLeaveByUser = new Map<string, Row>();
    const activeLeaveByStaff = new Map<string, Row>();
    for (const leave of leaveRows) {
      if (asString(leave.status).toLowerCase() !== "approved") continue;
      if (!isTodayBetween(leave.start_date, leave.end_date)) continue;
      if (leave.user_id) activeLeaveByUser.set(asString(leave.user_id), leave);
      if (leave.staff_id) activeLeaveByStaff.set(asString(leave.staff_id), leave);
    }

    const staff = staffRows.map((row) => {
      const leave = activeLeaveByUser.get(asString(row.id)) || activeLeaveByStaff.get(asString(row.staff_id));
      const active = row.is_active !== false && asString(row.staff_status, "active").toLowerCase() !== "inactive";
      const state = !active ? "inactive" : leave ? "on_leave" : "available";
      return {
        id: asString(row.id),
        staffId: asString(row.staff_id),
        name: asString(row.name, "User"),
        email: asString(row.email),
        roleId: asString(row.role_id),
        departmentId: row.department_id ? asString(row.department_id) : null,
        departmentName: asString(row.department_name, "Unassigned"),
        employeeId: asString(row.employee_id),
        position: asString(row.position, asString(row.role_id, "Staff")),
        hireDate: asDate(row.hire_date),
        isActive: active,
        state,
        leave: leave
          ? {
              id: asString(leave.id),
              type: asString(leave.leave_type, "leave"),
              startDate: asDate(leave.start_date),
              endDate: asDate(leave.end_date),
              days: asNumber(leave.number_of_days),
              reason: asString(leave.reason),
            }
          : null,
      };
    });

    const departmentCoverage = new Map<string, { departmentId: string | null; departmentName: string; total: number; available: number; onLeave: number; inactive: number }>();
    for (const member of staff) {
      const key = member.departmentId || "unassigned";
      const current = departmentCoverage.get(key) || {
        departmentId: member.departmentId,
        departmentName: member.departmentName,
        total: 0,
        available: 0,
        onLeave: 0,
        inactive: 0,
      };
      current.total += 1;
      if (member.state === "available") current.available += 1;
      if (member.state === "on_leave") current.onLeave += 1;
      if (member.state === "inactive") current.inactive += 1;
      departmentCoverage.set(key, current);
    }

    const pendingLeave = leaveRows
      .filter((row) => asString(row.status).toLowerCase() === "pending")
      .map((row) => ({
        id: asString(row.id),
        staffId: asString(row.staff_id),
        staffName: asString(row.staff_name, "Staff member"),
        staffEmail: asString(row.staff_email),
        staffPosition: asString(row.staff_position),
        leaveType: asString(row.leave_type, "leave"),
        startDate: asDate(row.start_date),
        endDate: asDate(row.end_date),
        days: asNumber(row.number_of_days),
        reason: asString(row.reason),
        status: asString(row.status, "pending"),
        createdAt: asDate(row.created_at),
      }));

    const available = staff.filter((member) => member.state === "available").length;
    const onLeave = staff.filter((member) => member.state === "on_leave").length;
    const inactive = staff.filter((member) => member.state === "inactive").length;
    const coverageRate = staff.length ? Math.round((available / staff.length) * 1000) / 10 : 0;

    return NextResponse.json({
      school,
      generatedAt: new Date().toISOString(),
      staff,
      pendingLeave,
      departments: departmentRows.map((row) => ({
        id: asString(row.id),
        name: asString(row.name, "Department"),
        headId: row.head_id ? asString(row.head_id) : null,
      })),
      departmentCoverage: Array.from(departmentCoverage.values()).map((row) => ({
        ...row,
        coverageRate: row.total ? Math.round((row.available / row.total) * 1000) / 10 : 0,
      })),
      summary: {
        totalStaff: staff.length,
        available,
        onLeave,
        inactive,
        pendingLeave: pendingLeave.length,
        coverageRate,
        departments: departmentRows.length,
      },
    });
  } catch (error) {
    console.error("Owner staff attendance GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner staff attendance data" }, { status: 500 });
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
    if (!id || !["approved", "rejected", "cancelled", "pending"].includes(status)) {
      return NextResponse.json({ error: "Valid leave id and status are required" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb
      .update(leaveTable)
      .set({ status, remarks: body.remarks ? asString(body.remarks) : undefined, updatedAt: new Date() })
      .where(eq(leaveTable.id, id));

    return NextResponse.json({ success: true, message: "Leave status updated" });
  } catch (error) {
    console.error("Owner staff attendance PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
  }
}
