import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getTenantDb, masterDb } from "@/lib/db";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { convertMoney } from "@/lib/currency-conversion";
import { getCachedValue, setCachedValue } from "@/lib/server-response-cache";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QueryableDb = ReturnType<typeof getTenantDb>;
type Row = Record<string, unknown>;

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatMonth(date: Date) {
  return date.toLocaleString("en", { month: "short" });
}

function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      month: formatMonth(date),
      students: 0,
      revenue: 0,
      attendance: 0,
      performance: 0,
    };
  });
}

function resolveSlug(request: NextRequest) {
  const explicit = request.nextUrl.searchParams.get("slug")?.trim();
  if (explicit) return explicit;
  return getTenantSubdomain(request.headers.get("host")) || "";
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Tenant dashboard query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
}

function roleMatches(role: string, tokens: string[]) {
  return tokens.some((token) => role === token || role.endsWith(`_${token}`) || role.includes(token));
}

export async function GET(request: NextRequest) {
  const slug = resolveSlug(request);
  if (!slug) {
    return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  }
  const portal = request.nextUrl.searchParams.get("portal")?.trim().toLowerCase() || "tenant";

  const schoolResult = await masterDb.execute(sql`
    select id, name, slug, type, status, country, currency_code, currency_name, subscription_id, created_at, updated_at, database_url
    from schools
    where slug = ${slug}
    limit 1
  `);
  const school = schoolResult.rows[0] as Row | undefined;
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  if (portal === "owner") {
    const owner = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(owner)) return owner;
  } else {
    const admin = await requireTenantAdmin(request, slug);
    if (isTenantAdminResponse(admin)) return admin;
  }

  const cacheKey = `tenant-dashboard:${slug}:${portal}`;
  const cached = getCachedValue<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Roxan-Cache": "HIT",
      },
    });
  }

  const tenantDb = getTenantDb(String(school.database_url || ""));
  const schoolId = String(school.id);

  const [
    studentsSummary,
    users,
    classes,
    attendanceSummary,
    attendanceTrendRows,
    gradeSummary,
    gradeTrendRows,
    studentInvoiceSummary,
    paymentSummary,
    paymentTrendRows,
    platformInvoiceRows,
    subscriptionRows,
    announcements,
    broadcastsSummary,
    messagesSummary,
    recentStudents,
    recentPayments,
    recentInvoices,
    recentAnnouncements,
    pendingLeave,
  ] = await Promise.all([
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) = 'active')::int as active,
        count(*) filter (where created_at >= now() - interval '30 days')::int as new_this_month
      from students
    `),
    rows(tenantDb, sql`
      select id, name, email, role_id, is_active, created_at
      from users
      where lower(coalesce(role_id, '')) not in ('super_admin', 'master', 'platform_admin')
    `),
    rows(tenantDb, sql`
      select id, name, grade, section, capacity, teacher_id, created_at
      from classes
      order by grade asc, name asc
    `),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) in ('present', 'late'))::int as present,
        count(*) filter (where lower(status) = 'absent')::int as absent,
        count(*) filter (where attendance_date >= current_date)::int as today_total,
        count(*) filter (where attendance_date >= current_date and lower(status) in ('present', 'late'))::int as today_present
      from attendance
      where attendance_date >= now() - interval '30 days'
    `),
    rows(tenantDb, sql`
      select to_char(attendance_date, 'YYYY-MM') as month,
        count(*)::int as total,
        count(*) filter (where lower(status) in ('present', 'late'))::int as present
      from attendance
      where attendance_date >= date_trunc('month', now()) - interval '5 months'
      group by 1
    `),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        avg(coalesce(percentage, (score / nullif(max_score, 0)) * 100))::numeric(8,2) as average
      from grades
      where assessment_date >= now() - interval '90 days'
    `),
    rows(tenantDb, sql`
      select to_char(assessment_date, 'YYYY-MM') as month,
        avg(coalesce(percentage, (score / nullif(max_score, 0)) * 100))::numeric(8,2) as average
      from grades
      where assessment_date >= date_trunc('month', now()) - interval '5 months'
      group by 1
    `),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        coalesce(sum(total_amount), 0)::numeric(14,2) as billed,
        coalesce(sum(amount_paid), 0)::numeric(14,2) as paid,
        coalesce(sum(outstanding_balance), 0)::numeric(14,2) as outstanding,
        count(*) filter (where lower(status) in ('overdue', 'unpaid'))::int as attention
      from student_invoices
    `),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        coalesce(sum(amount) filter (where lower(status) in ('completed', 'paid', 'success')), 0)::numeric(14,2) as collected,
        count(*) filter (where lower(status) = 'pending')::int as pending,
        count(*) filter (where lower(status) = 'failed')::int as failed
      from payments
    `),
    rows(tenantDb, sql`
      select to_char(created_at, 'YYYY-MM') as month,
        coalesce(sum(amount) filter (where lower(status) in ('completed', 'paid', 'success')), 0)::numeric(14,2) as revenue
      from payments
      where created_at >= date_trunc('month', now()) - interval '5 months'
      group by 1
    `),
    rows(masterDb as unknown as QueryableDb, sql`
      select amount, currency, status, due_date
      from invoices
      where school_id = ${schoolId}
    `),
    rows(masterDb as unknown as QueryableDb, sql`
      select sub.status, sub.start_date, sub.end_date, sub.auto_renew,
        plan.name as plan_name, plan.price, plan.max_students, plan.max_staff
      from subscriptions sub
      left join subscription_plans plan on plan.id = sub.plan_id
      where sub.school_id = ${schoolId}
      order by sub.created_at desc
      limit 1
    `),
    rows(tenantDb, sql`
      select id, title, is_published, publish_date, expiry_date, created_at
      from announcements
      order by created_at desc
      limit 5
    `),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) = 'sent')::int as sent,
        count(*) filter (where lower(status) in ('draft', 'scheduled'))::int as pending,
        count(*) filter (where lower(status) = 'failed')::int as failed
      from broadcasts
    `),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where created_at >= now() - interval '7 days')::int as last_7_days
      from messages
    `),
    rows(tenantDb, sql`
      select s.id, s.admission_number, s.status, s.created_at, u.name
      from students s
      left join users u on u.id = s.user_id
      order by s.created_at desc
      limit 5
    `),
    rows(tenantDb, sql`
      select id, amount, payment_method, payment_reference, status, created_at
      from payments
      order by created_at desc
      limit 5
    `),
    rows(tenantDb, sql`
      select id, invoice_number, total_amount, outstanding_balance, status, created_at
      from student_invoices
      order by created_at desc
      limit 5
    `),
    rows(tenantDb, sql`
      select id, title, is_published, created_at
      from announcements
      order by created_at desc
      limit 5
    `),
    first(tenantDb, sql`
      select count(*)::int as total
      from leave
      where lower(status) = 'pending'
    `),
  ]);

  const normalizedUsers = users.map((user) => ({
    id: String(user.id || ""),
    name: stringValue(user.name, "User"),
    email: stringValue(user.email),
    roleId: String(user.role_id || "").toLowerCase(),
    isActive: user.is_active !== false,
    createdAt: isoDate(user.created_at),
  }));

  const ownerCount = normalizedUsers.filter((user) => roleMatches(user.roleId, ["owner"])).length;
  const adminCount = normalizedUsers.filter((user) => roleMatches(user.roleId, ["school_admin", "admin", "principal", "headteacher"])).length;
  const teacherCount = normalizedUsers.filter((user) =>
    roleMatches(user.roleId, ["teacher", "lecturer", "professor", "instructor", "trainer"])
  ).length;
  const parentCount = normalizedUsers.filter((user) => roleMatches(user.roleId, ["parent", "guardian", "sponsor"])).length;
  const activeUsers = normalizedUsers.filter((user) => user.isActive).length;
  const studentTotal = numberValue(studentsSummary.total);
  const classTotal = classes.length;
  const totalCapacity = classes.reduce((sum, row) => sum + numberValue(row.capacity), 0);
  const attendanceTotal = numberValue(attendanceSummary.total);
  const attendanceRate = attendanceTotal ? Math.round((numberValue(attendanceSummary.present) / attendanceTotal) * 1000) / 10 : 0;
  const todayAttendanceRate = numberValue(attendanceSummary.today_total)
    ? Math.round((numberValue(attendanceSummary.today_present) / numberValue(attendanceSummary.today_total)) * 1000) / 10
    : 0;
  const performanceAverage = Math.round(numberValue(gradeSummary.average) * 10) / 10;
  const collectionRate = numberValue(studentInvoiceSummary.billed)
    ? Math.round((numberValue(studentInvoiceSummary.paid) / numberValue(studentInvoiceSummary.billed)) * 1000) / 10
    : 0;
  const tenantCurrency = stringValue(school.currency_code, "ZAR");
  const convertedPlatformInvoices = await Promise.all(
    platformInvoiceRows.map(async (row) => {
      const converted = await convertMoney(row.amount, stringValue(row.currency, tenantCurrency), tenantCurrency);
      const status = stringValue(row.status, "pending").toLowerCase();
      const dueDate = row.due_date ? new Date(String(row.due_date)) : null;
      const resolvedStatus = status === "pending" && dueDate && dueDate.getTime() < Date.now() ? "overdue" : status;
      return { amount: converted.displayAmount, status: resolvedStatus };
    })
  );
  const platformInvoiceSummary = convertedPlatformInvoices.reduce(
    (acc, invoice) => {
      acc.total += 1;
      acc.amount += invoice.amount;
      if (invoice.status === "pending") acc.pending += 1;
      if (invoice.status === "overdue") acc.overdue += 1;
      return acc;
    },
    { total: 0, amount: 0, pending: 0, overdue: 0 }
  );

  const monthly = lastSixMonths();
  const monthMap = new Map(monthly.map((entry) => [entry.key, entry]));

  const studentMonthRows = await rows(tenantDb, sql`
    select to_char(created_at, 'YYYY-MM') as month, count(*)::int as total
    from students
    where created_at >= date_trunc('month', now()) - interval '5 months'
    group by 1
  `);
  for (const row of studentMonthRows) {
    const entry = monthMap.get(String(row.month));
    if (entry) entry.students = numberValue(row.total);
  }
  for (const row of paymentTrendRows) {
    const entry = monthMap.get(String(row.month));
    if (entry) entry.revenue = numberValue(row.revenue);
  }
  for (const row of attendanceTrendRows) {
    const entry = monthMap.get(String(row.month));
    if (entry) entry.attendance = numberValue(row.total) ? Math.round((numberValue(row.present) / numberValue(row.total)) * 1000) / 10 : 0;
  }
  for (const row of gradeTrendRows) {
    const entry = monthMap.get(String(row.month));
    if (entry) entry.performance = Math.round(numberValue(row.average) * 10) / 10;
  }

  const classDistributionMap = new Map<string, number>();
  for (const row of classes) {
    const grade = stringValue(row.grade, "Unassigned");
    classDistributionMap.set(grade, (classDistributionMap.get(grade) || 0) + 1);
  }

  const recentActivity = [
    ...recentStudents.map((row) => ({
      type: "student",
      title: "New student enrolled",
      description: `${stringValue(row.name, "Student")} ${row.admission_number ? `(${row.admission_number})` : ""}`.trim(),
      status: stringValue(row.status, "active"),
      timestamp: isoDate(row.created_at),
      href: "/admin/students",
    })),
    ...recentPayments.map((row) => ({
      type: "payment",
      title: "Payment recorded",
      description: `${stringValue(row.payment_reference, "Payment")} - ${stringValue(row.status, "pending")}`,
      amount: numberValue(row.amount),
      status: stringValue(row.status, "pending"),
      timestamp: isoDate(row.created_at),
      href: "/admin/billing",
    })),
    ...recentInvoices.map((row) => ({
      type: "invoice",
      title: "Student invoice updated",
      description: `${stringValue(row.invoice_number, "Invoice")} - ${stringValue(row.status, "unpaid")}`,
      amount: numberValue(row.outstanding_balance || row.total_amount),
      status: stringValue(row.status, "unpaid"),
      timestamp: isoDate(row.created_at),
      href: "/admin/billing",
    })),
    ...recentAnnouncements.map((row) => ({
      type: "announcement",
      title: row.is_published ? "Announcement published" : "Announcement drafted",
      description: stringValue(row.title, "Announcement"),
      status: row.is_published ? "published" : "draft",
      timestamp: isoDate(row.created_at),
      href: "/admin/announcements",
    })),
  ]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 8);

  const payload = {
      generatedAt: new Date().toISOString(),
      school: {
        id: schoolId,
        name: stringValue(school.name, slug),
        slug,
        type: stringValue(school.type, "secondary"),
        status: stringValue(school.status, "active"),
        country: stringValue(school.country),
        currencyCode: tenantCurrency,
        currencyName: stringValue(school.currency_name, "South African Rand"),
        createdAt: isoDate(school.created_at),
      },
      subscription: subscriptionRows[0]
        ? {
            status: stringValue(subscriptionRows[0].status, "active"),
            planName: stringValue(subscriptionRows[0].plan_name, "Unassigned plan"),
            price: numberValue(subscriptionRows[0].price),
            maxStudents: subscriptionRows[0].max_students ?? null,
            maxStaff: subscriptionRows[0].max_staff ?? null,
            autoRenew: subscriptionRows[0].auto_renew !== false,
            startDate: isoDate(subscriptionRows[0].start_date),
            endDate: isoDate(subscriptionRows[0].end_date),
          }
        : null,
      kpis: {
        totalStudents: studentTotal,
        activeStudents: numberValue(studentsSummary.active),
        newStudentsThisMonth: numberValue(studentsSummary.new_this_month),
        totalTeachers: teacherCount,
        totalStaff: normalizedUsers.filter((user) => !roleMatches(user.roleId, ["student", "pupil", "learner", "parent", "guardian"])).length,
        totalClasses: classTotal,
        attendanceRate,
        todayAttendanceRate,
        performanceAverage,
        activeUsers,
        ownerCount,
        adminCount,
        parentCount,
        totalCapacity,
        capacityUsed: totalCapacity ? Math.round((studentTotal / totalCapacity) * 1000) / 10 : 0,
      },
      finance: {
        billed: numberValue(studentInvoiceSummary.billed),
        paid: numberValue(studentInvoiceSummary.paid),
        outstanding: numberValue(studentInvoiceSummary.outstanding),
        collectionRate,
        paymentsCollected: numberValue(paymentSummary.collected),
        pendingPayments: numberValue(paymentSummary.pending),
        failedPayments: numberValue(paymentSummary.failed),
        studentInvoices: numberValue(studentInvoiceSummary.total),
        invoicesNeedingAttention: numberValue(studentInvoiceSummary.attention),
        platformInvoiceAmount: numberValue(platformInvoiceSummary.amount),
        platformInvoicesPending: numberValue(platformInvoiceSummary.pending),
        platformInvoicesOverdue: numberValue(platformInvoiceSummary.overdue),
      },
      operations: {
        announcements: announcements.map((row) => ({
          id: String(row.id),
          title: stringValue(row.title, "Announcement"),
          published: Boolean(row.is_published),
          publishDate: isoDate(row.publish_date),
          expiryDate: isoDate(row.expiry_date),
          createdAt: isoDate(row.created_at),
        })),
        broadcasts: {
          total: numberValue(broadcastsSummary.total),
          sent: numberValue(broadcastsSummary.sent),
          pending: numberValue(broadcastsSummary.pending),
          failed: numberValue(broadcastsSummary.failed),
        },
        messages: {
          total: numberValue(messagesSummary.total),
          last7Days: numberValue(messagesSummary.last_7_days),
        },
        pendingLeaveRequests: numberValue(pendingLeave.total),
      },
      charts: {
        monthly,
        classDistribution: Array.from(classDistributionMap.entries()).map(([name, value]) => ({ name, value })),
      },
      recentActivity,
      attention: [
        {
          label: "Overdue or unpaid student invoices",
          value: numberValue(studentInvoiceSummary.attention),
          severity: numberValue(studentInvoiceSummary.attention) > 0 ? "warning" : "healthy",
          href: "/admin/billing",
        },
        {
          label: "Pending platform invoices",
          value: numberValue(platformInvoiceSummary.pending) + numberValue(platformInvoiceSummary.overdue),
          severity: numberValue(platformInvoiceSummary.overdue) > 0 ? "critical" : numberValue(platformInvoiceSummary.pending) > 0 ? "warning" : "healthy",
          href: "/admin/billing",
        },
        {
          label: "Pending leave requests",
          value: numberValue(pendingLeave.total),
          severity: numberValue(pendingLeave.total) > 0 ? "info" : "healthy",
          href: "/admin/staff",
        },
        {
          label: "Failed broadcasts",
          value: numberValue(broadcastsSummary.failed),
          severity: numberValue(broadcastsSummary.failed) > 0 ? "critical" : "healthy",
          href: "/admin/broadcasts",
        },
      ],
    };
  setCachedValue(cacheKey, payload, 30_000);
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=30",
      "X-Roxan-Cache": "MISS",
    },
  });
}
