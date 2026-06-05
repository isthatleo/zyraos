import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { payrollTable, schoolsTable } from "@/lib/db-schema";

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

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner payroll ${label} query skipped:`, error instanceof Error ? error.message : error);
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

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;

  const tenantDb = await getTenantDbBySlug(slug);
  const [staffRows, payrollRows, departmentRows] = await Promise.all([
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            s.id as staff_id,
            s.employee_id,
            s.position,
            s.salary,
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
            p.updated_at,
            coalesce(u.name, s.employee_id, p.staff_id) as staff_name,
            u.email as staff_email,
            u.role_id as staff_role,
            d.name as department_name,
            s.position as staff_position
          from payroll p
          left join staff s on s.id = p.staff_id
          left join users u on u.id = s.user_id
          left join departments d on d.id = coalesce(u.department_id, s.department_id)
          order by p.created_at desc
          limit 300
        `),
      "payroll"
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
    salary: asNumber(row.salary),
    active: row.is_active !== false && asString(row.staff_status, "active").toLowerCase() !== "inactive",
  }));

  const payroll = payrollRows.map((row) => ({
    id: asString(row.id),
    staffId: asString(row.staff_id),
    staffName: asString(row.staff_name, "Staff member"),
    staffEmail: asString(row.staff_email),
    staffRole: asString(row.staff_role),
    staffPosition: asString(row.staff_position),
    departmentName: asString(row.department_name, "Unassigned"),
    period: asString(row.payroll_period, "monthly"),
    month: asString(row.payroll_month, "Unassigned"),
    basicSalary: asNumber(row.basic_salary),
    allowances: asNumber(row.allowances),
    deductions: asNumber(row.deductions),
    grossSalary: asNumber(row.gross_salary),
    netSalary: asNumber(row.net_salary),
    status: asString(row.status, "pending").toLowerCase(),
    paymentDate: asDate(row.payment_date),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  }));

  const byStatus = new Map<string, { name: string; records: number; amount: number }>();
  const byDepartment = new Map<string, { name: string; records: number; gross: number; net: number; pending: number; approved: number; paid: number; cancelled: number }>();
  const byMonth = new Map<string, { name: string; gross: number; net: number; records: number }>();

  for (const item of payroll) {
    const statusCurrent = byStatus.get(item.status) || { name: item.status, records: 0, amount: 0 };
    statusCurrent.records += 1;
    statusCurrent.amount += item.netSalary;
    byStatus.set(item.status, statusCurrent);

    const departmentCurrent = byDepartment.get(item.departmentName) || {
      name: item.departmentName,
      records: 0,
      gross: 0,
      net: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      cancelled: 0,
    };
    departmentCurrent.records += 1;
    departmentCurrent.gross += item.grossSalary;
    departmentCurrent.net += item.netSalary;
    if (item.status === "pending") departmentCurrent.pending += 1;
    if (item.status === "approved") departmentCurrent.approved += 1;
    if (item.status === "paid") departmentCurrent.paid += 1;
    if (item.status === "cancelled") departmentCurrent.cancelled += 1;
    byDepartment.set(item.departmentName, departmentCurrent);

    const monthCurrent = byMonth.get(item.month) || { name: item.month, gross: 0, net: 0, records: 0 };
    monthCurrent.gross += item.grossSalary;
    monthCurrent.net += item.netSalary;
    monthCurrent.records += 1;
    byMonth.set(item.month, monthCurrent);
  }

  const grossPayroll = payroll.reduce((sum, item) => sum + item.grossSalary, 0);
  const netPayroll = payroll.reduce((sum, item) => sum + item.netSalary, 0);
  const pendingPayroll = payroll.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.netSalary, 0);
  const approvedPayroll = payroll.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.netSalary, 0);
  const paidPayroll = payroll.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.netSalary, 0);
  const totalDeductions = payroll.reduce((sum, item) => sum + item.deductions, 0);
  const totalAllowances = payroll.reduce((sum, item) => sum + item.allowances, 0);

  return {
    school,
    generatedAt: new Date().toISOString(),
    staff,
    payroll,
    departments: departmentRows.map((row) => ({
      id: asString(row.id),
      name: asString(row.name, "Department"),
      headId: row.head_id ? asString(row.head_id) : null,
    })),
    analytics: {
      byStatus: Array.from(byStatus.values()),
      byDepartment: Array.from(byDepartment.values()).sort((a, b) => b.net - a.net),
      byMonth: Array.from(byMonth.values()).reverse().slice(0, 8).reverse(),
    },
    summary: {
      records: payroll.length,
      activeStaff: staff.filter((member) => member.active).length,
      grossPayroll,
      netPayroll,
      pendingPayroll,
      approvedPayroll,
      paidPayroll,
      totalDeductions,
      totalAllowances,
      pendingRecords: payroll.filter((item) => item.status === "pending").length,
      approvedRecords: payroll.filter((item) => item.status === "approved").length,
      paidRecords: payroll.filter((item) => item.status === "paid").length,
      cancelledRecords: payroll.filter((item) => item.status === "cancelled").length,
      payoutCompletion: netPayroll ? Math.round((paidPayroll / netPayroll) * 1000) / 10 : 0,
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
    console.error("Owner payroll GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner payroll data" }, { status: 500 });
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
    const period = asString(body.period, "monthly").toLowerCase();
    const month = asString(body.month);
    const basicSalary = asNumber(body.basicSalary);
    const allowances = asNumber(body.allowances);
    const deductions = asNumber(body.deductions);
    const status = asString(body.status, "pending").toLowerCase();

    if (!staffId || !month || basicSalary <= 0) {
      return NextResponse.json({ error: "Staff member, payroll month, and basic salary are required" }, { status: 400 });
    }
    if (!["monthly", "bi-weekly", "weekly", "contract", "bonus"].includes(period)) {
      return NextResponse.json({ error: "Invalid payroll period" }, { status: 400 });
    }
    if (!["pending", "approved"].includes(status)) {
      return NextResponse.json({ error: "New payroll records can only be pending or approved" }, { status: 400 });
    }

    const grossSalary = basicSalary + allowances;
    const netSalary = Math.max(0, grossSalary - deductions);
    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb.insert(payrollTable).values({
      id: crypto.randomUUID(),
      staffId,
      payrollPeriod: period,
      payrollMonth: month,
      basicSalary: String(basicSalary),
      allowances: String(allowances),
      deductions: String(deductions),
      grossSalary: String(grossSalary),
      netSalary: String(netSalary),
      status,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Payroll record created" }, { status: 201 });
  } catch (error) {
    console.error("Owner payroll POST failed:", error);
    return NextResponse.json({ error: "Failed to create payroll record" }, { status: 500 });
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
    if (!id || !["pending", "approved", "paid", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Valid payroll id and status are required" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb
      .update(payrollTable)
      .set({ status, paymentDate: status === "paid" ? new Date() : undefined, updatedAt: new Date() })
      .where(eq(payrollTable.id, id));

    return NextResponse.json({ success: true, message: "Payroll status updated" });
  } catch (error) {
    console.error("Owner payroll PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update payroll status" }, { status: 500 });
  }
}
