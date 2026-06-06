import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { leaveTable, payrollTable, schoolsTable } from "@/lib/db-schema";
import { deleteCachedValue, getCachedValue, setCachedValue } from "@/lib/server-response-cache";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function valueNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function valueString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function valueDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner HR ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, type: schoolsTable.type, slug: schoolsTable.slug, currencyCode: schoolsTable.currencyCode })
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
    const owner = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(owner)) return owner;
    const cacheKey = `owner-hr:${slug}`;
    const cached = getCachedValue<Record<string, unknown>>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=30", "X-Roxan-Cache": "HIT" } });

    const tenantDb = await getTenantDbBySlug(slug);
    const [staffRows, departmentRows, leaveRows, payrollRows] = await Promise.all([
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
              u.created_at,
              d.name as department_name,
              s.id as staff_id,
              s.employee_id,
              s.position,
              s.hire_date,
              s.salary,
              s.status as staff_status
            from users u
            left join departments d on d.id = u.department_id
            left join staff s on s.user_id = u.id
            where lower(u.role_id) not like '%student%'
              and lower(u.role_id) not like '%pupil%'
              and lower(u.role_id) not like '%learner%'
              and lower(u.role_id) not like '%parent%'
              and lower(u.role_id) not like '%guardian%'
              and lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')
            order by u.created_at desc
          `),
        "staff"
      ),
      safeRows<Row>(() => tenantDb.execute(sql`select id, name, head_id, created_at from departments order by name asc`), "departments"),
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
              coalesce(u.name, s.employee_id, l.staff_id) as staff_name,
              u.email as staff_email,
              s.position as staff_position
            from leave l
            left join staff s on s.id = l.staff_id
            left join users u on u.id = s.user_id
            order by l.created_at desc
            limit 50
          `),
        "leave"
      ),
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              p.id,
              p.staff_id,
              p.payroll_period,
              p.payroll_month,
              p.basic_salary,
              p.allowances,
              p.deductions,
              p.gross_salary,
              p.net_salary,
              p.status,
              p.payment_date,
              p.created_at,
              coalesce(u.name, s.employee_id, p.staff_id) as staff_name,
              u.email as staff_email,
              s.position as staff_position
            from payroll p
            left join staff s on s.id = p.staff_id
            left join users u on u.id = s.user_id
            order by p.created_at desc
            limit 50
          `),
        "payroll"
      ),
    ]);

    const staff = staffRows.map((row) => ({
      id: valueString(row.id),
      staffId: valueString(row.staff_id),
      name: valueString(row.name, "User"),
      email: valueString(row.email),
      roleId: valueString(row.role_id),
      departmentId: row.department_id ? valueString(row.department_id) : null,
      departmentName: valueString(row.department_name, "Unassigned"),
      isActive: row.is_active !== false,
      employeeId: valueString(row.employee_id),
      position: valueString(row.position, valueString(row.role_id, "Staff")),
      hireDate: valueDate(row.hire_date || row.created_at),
      salary: valueNumber(row.salary),
      status: valueString(row.staff_status, row.is_active === false ? "inactive" : "active"),
    }));

    const leave = leaveRows.map((row) => ({
      id: valueString(row.id),
      staffId: valueString(row.staff_id),
      staffName: valueString(row.staff_name, "Staff member"),
      staffEmail: valueString(row.staff_email),
      staffPosition: valueString(row.staff_position),
      leaveType: valueString(row.leave_type, "leave"),
      startDate: valueDate(row.start_date),
      endDate: valueDate(row.end_date),
      days: valueNumber(row.number_of_days),
      reason: valueString(row.reason),
      approvedBy: row.approved_by ? valueString(row.approved_by) : null,
      status: valueString(row.status, "pending"),
      remarks: valueString(row.remarks),
      createdAt: valueDate(row.created_at),
    }));

    const payroll = payrollRows.map((row) => ({
      id: valueString(row.id),
      staffId: valueString(row.staff_id),
      staffName: valueString(row.staff_name, "Staff member"),
      staffEmail: valueString(row.staff_email),
      staffPosition: valueString(row.staff_position),
      period: valueString(row.payroll_period, "monthly"),
      month: valueString(row.payroll_month, "Unassigned"),
      basicSalary: valueNumber(row.basic_salary),
      allowances: valueNumber(row.allowances),
      deductions: valueNumber(row.deductions),
      grossSalary: valueNumber(row.gross_salary),
      netSalary: valueNumber(row.net_salary),
      status: valueString(row.status, "pending"),
      paymentDate: valueDate(row.payment_date),
      createdAt: valueDate(row.created_at),
    }));

    const departmentMap = new Map<string, number>();
    for (const member of staff) {
      departmentMap.set(member.departmentName, (departmentMap.get(member.departmentName) || 0) + 1);
    }

    const totalPayroll = payroll.reduce((sum, item) => sum + item.netSalary, 0);
    const pendingPayroll = payroll.filter((item) => ["pending", "approved"].includes(item.status.toLowerCase())).reduce((sum, item) => sum + item.netSalary, 0);
    const approvedLeaveDays = leave.filter((item) => item.status.toLowerCase() === "approved").reduce((sum, item) => sum + item.days, 0);

    const payload = {
      school,
      staff,
      leave,
      payroll,
      departments: departmentRows.map((row) => ({
        id: valueString(row.id),
        name: valueString(row.name, "Department"),
        headId: row.head_id ? valueString(row.head_id) : null,
        createdAt: valueDate(row.created_at),
      })),
      departmentDistribution: Array.from(departmentMap.entries()).map(([name, value]) => ({ name, value })),
      summary: {
        totalStaff: staff.length,
        activeStaff: staff.filter((member) => member.isActive).length,
        inactiveStaff: staff.filter((member) => !member.isActive).length,
        departments: departmentRows.length,
        pendingLeave: leave.filter((item) => item.status.toLowerCase() === "pending").length,
        approvedLeaveDays,
        payrollRecords: payroll.length,
        totalPayroll,
        pendingPayroll,
        payrollPaid: payroll.filter((item) => item.status.toLowerCase() === "paid").length,
      },
    };
    setCachedValue(cacheKey, payload, 30_000);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=30", "X-Roxan-Cache": "MISS" } });
  } catch (error) {
    console.error("Owner HR GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner HR data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const owner = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(owner)) return owner;

    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "").trim();
    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim().toLowerCase();
    const remarks = body.remarks ? String(body.remarks) : undefined;
    if (!type || !id || !status) return NextResponse.json({ error: "Type, id, and status are required" }, { status: 400 });

    const tenantDb = await getTenantDbBySlug(slug);
    if (type === "leave") {
      if (!["pending", "approved", "rejected", "cancelled"].includes(status)) {
        return NextResponse.json({ error: "Invalid leave status" }, { status: 400 });
      }
      const [record] = await safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select l.id, l.status
            from leave l
            join staff s on s.id = l.staff_id
            join users u on u.id = s.user_id
            where l.id = ${id}
              and lower(u.role_id) not like '%student%'
              and lower(u.role_id) not like '%parent%'
              and lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')
            limit 1
          `),
        "leave ownership"
      );
      if (!record) return NextResponse.json({ error: "Leave record not found in this tenant" }, { status: 404 });
      await tenantDb
        .update(leaveTable)
        .set({ status, remarks, updatedAt: new Date() })
        .where(eq(leaveTable.id, id));
      deleteCachedValue(`owner-hr:${slug}`);
      deleteCachedValue(`owner-leave:${slug}`);
      deleteCachedValue(`owner-staff-attendance:${slug}`);
      await writeTenantAuditLog({
        db: tenantDb,
        request,
        actorId: owner.userId,
        action: "leave.status_updated",
        resource: "leave",
        resourceId: id,
        changes: { from: record.status, to: status, remarks: remarks || null, source: "owner_hr" },
      }).catch((error) => console.warn("Owner HR leave audit log skipped:", error instanceof Error ? error.message : error));
      return NextResponse.json({ success: true, message: "Leave status updated" });
    }

    if (type === "payroll") {
      if (!["pending", "approved", "paid", "cancelled"].includes(status)) {
        return NextResponse.json({ error: "Invalid payroll status" }, { status: 400 });
      }
      const [record] = await safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select p.id, p.status
            from payroll p
            join staff s on s.id = p.staff_id
            join users u on u.id = s.user_id
            where p.id = ${id}
              and lower(u.role_id) not like '%student%'
              and lower(u.role_id) not like '%parent%'
              and lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')
            limit 1
          `),
        "payroll ownership"
      );
      if (!record) return NextResponse.json({ error: "Payroll record not found in this tenant" }, { status: 404 });
      await tenantDb
        .update(payrollTable)
        .set({ status, paymentDate: status === "paid" ? new Date() : undefined, updatedAt: new Date() })
        .where(eq(payrollTable.id, id));
      deleteCachedValue(`owner-hr:${slug}`);
      deleteCachedValue(`owner-payroll:${slug}`);
      await writeTenantAuditLog({
        db: tenantDb,
        request,
        actorId: owner.userId,
        action: "payroll.status_updated",
        resource: "payroll",
        resourceId: id,
        changes: { from: record.status, to: status, source: "owner_hr" },
      }).catch((error) => console.warn("Owner HR payroll audit log skipped:", error instanceof Error ? error.message : error));
      return NextResponse.json({ success: true, message: "Payroll status updated" });
    }

    return NextResponse.json({ error: "Unsupported update type" }, { status: 400 });
  } catch (error) {
    console.error("Owner HR PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update HR record" }, { status: 500 });
  }
}
