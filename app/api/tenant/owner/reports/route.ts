import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";
import { getTenantBranding } from "@/lib/tenant-branding-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type ReportSection = "executive" | "finance" | "payments" | "invoices" | "people" | "leave" | "payroll" | "attendance" | "academics" | "communications" | "governance" | "billing";
type ReportTemplate = {
  id: string;
  title: string;
  category: string;
  description: string;
  sections: ReportSection[];
  cadence: string;
  audience: string;
  customized?: boolean;
};
type TemplateSettings = {
  overrides?: Record<string, ReportTemplate>;
  deletedIds?: string[];
};

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "executive-overview", title: "Executive School Overview", category: "Executive", description: "Owner-level summary across enrollment, staffing, finance, attendance, and platform billing.", sections: ["executive", "finance", "people", "attendance", "billing"], cadence: "Monthly", audience: "Owners and board" },
  { id: "board-pack", title: "Board Pack Summary", category: "Executive", description: "A concise board-ready pack with strategic KPIs, financial exposure, and operational risks.", sections: ["executive", "finance", "people", "governance"], cadence: "Termly", audience: "Board" },
  { id: "financial-performance", title: "Financial Performance Report", category: "Finance", description: "Billed, collected, outstanding, failed payments, platform liabilities, and collection efficiency.", sections: ["finance", "payments", "invoices", "billing"], cadence: "Monthly", audience: "Owner and finance lead" },
  { id: "cashflow-collections", title: "Cashflow & Collections Report", category: "Finance", description: "Payment channels, collection trend, receivables pressure, and cashflow risk indicators.", sections: ["payments", "finance", "invoices"], cadence: "Weekly", audience: "Finance team" },
  { id: "outstanding-balances", title: "Outstanding Balances Report", category: "Finance", description: "Unpaid, partial, and overdue invoice exposure with student receivables overview.", sections: ["invoices", "finance"], cadence: "Weekly", audience: "Finance team" },
  { id: "platform-billing", title: "Roxan Platform Billing Report", category: "Billing", description: "Platform invoices, subscription exposure, pending and overdue platform obligations.", sections: ["billing", "finance"], cadence: "Monthly", audience: "Owner" },
  { id: "student-enrollment", title: "Student Enrollment Report", category: "Students", description: "Student population, active/new enrollment and capacity utilization.", sections: ["executive", "academics"], cadence: "Monthly", audience: "Leadership" },
  { id: "academic-performance", title: "Academic Performance Report", category: "Academics", description: "Assessment volume, grade averages, performance health, and learning indicators.", sections: ["academics", "executive"], cadence: "Termly", audience: "Academic leadership" },
  { id: "attendance-performance", title: "Student Attendance Report", category: "Attendance", description: "Attendance rate, today attendance, absence exposure, and attendance health.", sections: ["attendance", "executive"], cadence: "Weekly", audience: "Leadership" },
  { id: "staffing-overview", title: "Staffing Overview Report", category: "People", description: "Staff count, active staff, teachers, departments, and role distribution.", sections: ["people", "executive"], cadence: "Monthly", audience: "Owner and HR" },
  { id: "hr-compliance", title: "HR Compliance Report", category: "HR", description: "Leave queue, pending approvals, inactive staff and HR risk state.", sections: ["people", "leave", "governance"], cadence: "Monthly", audience: "Owner and HR" },
  { id: "leave-management", title: "Leave Management Report", category: "HR", description: "Leave requests, approvals, pending leave days, and workforce availability impact.", sections: ["leave", "people"], cadence: "Weekly", audience: "HR" },
  { id: "payroll-exposure", title: "Payroll Exposure Report", category: "Payroll", description: "Payroll records, pending/approved/paid exposure, deductions and allowances.", sections: ["payroll", "finance", "people"], cadence: "Monthly", audience: "Owner and finance" },
  { id: "department-readiness", title: "Department Readiness Report", category: "Operations", description: "Department staffing, coverage, payroll exposure, and operational readiness.", sections: ["people", "payroll", "leave"], cadence: "Monthly", audience: "Leadership" },
  { id: "communications-summary", title: "Communications Summary Report", category: "Communication", description: "Messages, broadcasts, announcement activity and communication delivery state.", sections: ["communications", "governance"], cadence: "Monthly", audience: "Leadership" },
  { id: "broadcast-delivery", title: "Broadcast Delivery Report", category: "Communication", description: "Sent, pending and failed broadcasts with communication governance indicators.", sections: ["communications"], cadence: "Weekly", audience: "Communications lead" },
  { id: "governance-risk", title: "Governance & Risk Report", category: "Governance", description: "Owners, admins, audit signals, pending leave, billing risk and failed broadcasts.", sections: ["governance", "billing", "leave"], cadence: "Monthly", audience: "Owner" },
  { id: "capacity-planning", title: "Capacity Planning Report", category: "Planning", description: "Student capacity usage, classes, staff capacity, subscription limits, and growth planning.", sections: ["executive", "academics", "people", "billing"], cadence: "Termly", audience: "Owner and board" },
  { id: "term-review", title: "Term Review Report", category: "Executive", description: "A term-ready review of academics, attendance, finance, people, and communications.", sections: ["executive", "academics", "attendance", "finance", "people", "communications"], cadence: "Termly", audience: "Leadership" },
  { id: "annual-owner-report", title: "Annual Owner Report", category: "Executive", description: "Comprehensive annual owner report covering all owner dashboard domains.", sections: ["executive", "finance", "payments", "invoices", "people", "leave", "payroll", "attendance", "academics", "communications", "governance", "billing"], cadence: "Annual", audience: "Owner and board" },
];

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function templateSettingsKey() {
  return "owner_report_templates";
}

function isReportSection(value: unknown): value is ReportSection {
  return ["executive", "finance", "payments", "invoices", "people", "leave", "payroll", "attendance", "academics", "communications", "governance", "billing"].includes(String(value));
}

function normalizeSections(value: unknown): ReportSection[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",").map((item) => item.trim())
      : [];
  const sections = raw.filter(isReportSection);
  return sections.length ? Array.from(new Set(sections)) : ["executive", "finance"];
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner reports ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function readTemplateSettings(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>): Promise<TemplateSettings> {
  const rows = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key = ${templateSettingsKey()} limit 1`), "template settings");
  const value = rows[0]?.value;
  if (!value || typeof value !== "object") return {};
  const settings = value as TemplateSettings;
  return {
    overrides: settings.overrides && typeof settings.overrides === "object" ? settings.overrides : {},
    deletedIds: Array.isArray(settings.deletedIds) ? settings.deletedIds.map(String) : [],
  };
}

async function writeTemplateSettings(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, settings: TemplateSettings) {
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, updated_at)
    values (${crypto.randomUUID()}, ${templateSettingsKey()}, ${JSON.stringify(settings)}::jsonb, 'reports', 'Owner report template overrides', now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
}

async function resolveTemplates(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>) {
  const settings = await readTemplateSettings(tenantDb);
  const deletedIds = new Set(settings.deletedIds || []);
  const overrides = settings.overrides || {};
  return REPORT_TEMPLATES
    .filter((template) => !deletedIds.has(template.id))
    .map((template) => ({ ...template, ...(overrides[template.id] || {}), id: template.id }));
}

function sanitizeTemplateUpdate(id: string, body: Row): ReportTemplate | null {
  const base = REPORT_TEMPLATES.find((item) => item.id === id);
  if (!base) return null;
  return {
    ...base,
    title: asString(body.title, base.title).slice(0, 120),
    category: asString(body.category, base.category).slice(0, 60),
    description: asString(body.description, base.description).slice(0, 500),
    sections: normalizeSections(body.sections),
    cadence: asString(body.cadence, base.cadence).slice(0, 60),
    audience: asString(body.audience, base.audience).slice(0, 100),
    customized: true,
  };
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      slug: schoolsTable.slug,
      country: schoolsTable.country,
      type: schoolsTable.type,
      status: schoolsTable.status,
      currencyCode: schoolsTable.currencyCode,
      currencyName: schoolsTable.currencyName,
      subscriptionId: schoolsTable.subscriptionId,
      createdAt: schoolsTable.createdAt,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function money(value: number, currency = "ZAR") {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(value % 1 ? 1 : 0)}%`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: unknown) {
  if (!value) return "Not set";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

async function buildReportData(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);

  const [branding, generalSettings, studentSummaryRows, userRows, classRows, attendanceRows, gradeRows, invoiceRows, paymentRows, platformRows, leaveRows, payrollRows, broadcastRows, messageRows, auditRows] =
    await Promise.all([
      getTenantBranding(slug, school.name),
      safeRows<Row>(() => tenantDb.execute(sql`select key, value from system_settings where category in ('general', 'branding', 'school') limit 50`), "school settings"),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where lower(status) = 'active')::int active, count(*) filter (where created_at >= now() - interval '30 days')::int new_this_month from students`), "students"),
      safeRows<Row>(() => tenantDb.execute(sql`select role_id, is_active from users`), "users"),
      safeRows<Row>(() => tenantDb.execute(sql`select id, name, grade, capacity from classes`), "classes"),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where lower(status) in ('present','late'))::int present, count(*) filter (where lower(status) = 'absent')::int absent, count(*) filter (where attendance_date >= current_date)::int today_total, count(*) filter (where attendance_date >= current_date and lower(status) in ('present','late'))::int today_present from attendance where attendance_date >= now() - interval '30 days'`), "attendance"),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, avg(coalesce(percentage, (score / nullif(max_score, 0)) * 100))::numeric(8,2) average from grades where assessment_date >= now() - interval '90 days'`), "grades"),
      safeRows<Row>(() => tenantDb.execute(sql`select id, invoice_number, total_amount, amount_paid, outstanding_balance, status, due_date, issued_date from student_invoices order by created_at desc limit 20`), "student invoices"),
      safeRows<Row>(() => tenantDb.execute(sql`select id, amount, payment_method, status, created_at from payments order by created_at desc limit 50`), "payments"),
      safeRows<Row>(() => masterDb.execute(sql`select id, invoice_number, amount, currency, status, due_date from invoices where school_id = ${school.id} order by created_at desc limit 20`), "platform invoices"),
      safeRows<Row>(() => tenantDb.execute(sql`select id, leave_type, number_of_days, status, created_at from leave order by created_at desc limit 50`), "leave"),
      safeRows<Row>(() => tenantDb.execute(sql`select id, payroll_month, gross_salary, net_salary, deductions, allowances, status from payroll order by created_at desc limit 50`), "payroll"),
      safeRows<Row>(() => tenantDb.execute(sql`select status, count(*)::int total from broadcasts group by status`), "broadcasts"),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where created_at >= now() - interval '7 days')::int last_7_days from messages`), "messages"),
      safeRows<Row>(() => tenantDb.execute(sql`select status, count(*)::int total from audit_logs group by status`), "audit"),
    ]);

  const settings = new Map(generalSettings.map((row) => [asString(row.key), row.value]));
  const users = userRows.map((row) => ({ role: asString(row.role_id).toLowerCase(), active: row.is_active !== false }));
  const studentSummary = studentSummaryRows[0] || {};
  const attendanceSummary = attendanceRows[0] || {};
  const gradeSummary = gradeRows[0] || {};
  const currency = school.currencyCode || "ZAR";
  const billed = invoiceRows.reduce((sum, row) => sum + asNumber(row.total_amount), 0);
  const paid = invoiceRows.reduce((sum, row) => sum + asNumber(row.amount_paid), 0);
  const outstanding = invoiceRows.reduce((sum, row) => sum + asNumber(row.outstanding_balance), 0);
  const collected = paymentRows.filter((row) => ["completed", "paid", "success"].includes(asString(row.status).toLowerCase())).reduce((sum, row) => sum + asNumber(row.amount), 0);
  const convertedPlatformRows: Row[] = await Promise.all(
    platformRows.map(async (row) => {
      const converted = await convertMoney(row.amount, asString(row.currency, "ZAR"), currency);
      return {
        ...row,
        amount: converted.displayAmount,
        currency: converted.displayCurrency,
        original_amount: converted.originalAmount,
        original_currency: converted.originalCurrency,
        exchange_rate: converted.exchangeRate,
        exchange_rate_date: converted.exchangeRateDate,
        exchange_rate_provider: converted.exchangeRateProvider,
        exchange_rate_stale: converted.exchangeRateStale,
        conversion_available: converted.conversionAvailable,
      };
    })
  );
  const platformDue = convertedPlatformRows.filter((row) => !["paid", "void"].includes(asString(row.status).toLowerCase())).reduce((sum, row) => sum + asNumber(row.amount), 0);
  const payrollNet = payrollRows.reduce((sum, row) => sum + asNumber(row.net_salary), 0);
  const leavePending = leaveRows.filter((row) => asString(row.status).toLowerCase() === "pending").length;
  const staff = users.filter((user) => !["student", "pupil", "learner", "parent", "guardian"].some((token) => user.role.includes(token)));
  const teachers = users.filter((user) => ["teacher", "lecturer", "professor", "instructor"].some((token) => user.role.includes(token)));
  const capacity = classRows.reduce((sum, row) => sum + asNumber(row.capacity), 0);
  const attendanceRate = asNumber(attendanceSummary.total) ? Math.round((asNumber(attendanceSummary.present) / asNumber(attendanceSummary.total)) * 1000) / 10 : 0;
  const todayAttendanceRate = asNumber(attendanceSummary.today_total) ? Math.round((asNumber(attendanceSummary.today_present) / asNumber(attendanceSummary.today_total)) * 1000) / 10 : 0;

  return {
    school: {
      ...school,
      displayName: branding.name || school.name,
      logoUrl: branding.logoUrl || null,
      schoolSealUrl: branding.schoolSealUrl,
      reportCardWatermarkUrl: branding.reportCardWatermarkUrl,
      emailHeaderLogoUrl: branding.emailHeaderLogoUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      address: branding.address || asString(settings.get("school_address") || settings.get("address") || school.country),
      phone: branding.phone || asString(settings.get("school_phone") || settings.get("phone")),
      email: branding.email || asString(settings.get("school_email") || settings.get("email")),
      website: branding.website,
      motto: branding.motto,
      currency,
    },
    generatedAt: new Date().toISOString(),
    summary: {
      students: asNumber(studentSummary.total),
      activeStudents: asNumber(studentSummary.active),
      newStudentsThisMonth: asNumber(studentSummary.new_this_month),
      classes: classRows.length,
      capacity,
      capacityUsed: capacity ? Math.round((asNumber(studentSummary.total) / capacity) * 1000) / 10 : 0,
      staff: staff.length,
      activeStaff: staff.filter((user) => user.active).length,
      teachers: teachers.length,
      attendanceRate,
      todayAttendanceRate,
      absent: asNumber(attendanceSummary.absent),
      performanceAverage: Math.round(asNumber(gradeSummary.average) * 10) / 10,
      assessments: asNumber(gradeSummary.total),
      billed,
      paid,
      outstanding,
      collected,
      collectionRate: billed ? Math.round((paid / billed) * 1000) / 10 : 0,
      platformDue,
      platformInvoices: convertedPlatformRows.length,
      leavePending,
      leaveRequests: leaveRows.length,
      payrollNet,
      payrollRecords: payrollRows.length,
      messages: asNumber(messageRows[0]?.total),
      messagesLast7Days: asNumber(messageRows[0]?.last_7_days),
      failedBroadcasts: broadcastRows.filter((row) => asString(row.status).toLowerCase() === "failed").reduce((sum, row) => sum + asNumber(row.total), 0),
    },
    rows: {
      invoices: invoiceRows,
      payments: paymentRows,
      platformInvoices: convertedPlatformRows,
      leave: leaveRows,
      payroll: payrollRows,
      broadcasts: broadcastRows,
      audit: auditRows,
      classes: classRows,
    },
  };
}

function metric(label: string, value: string | number, note = "") {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
}

function table(headers: string[], rows: Array<Array<string | number>>) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${
    rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">No records available.</td></tr>`
  }</tbody></table>`;
}

function renderSection(section: ReportSection, data: Awaited<ReturnType<typeof buildReportData>>) {
  if (!data) return "";
  const currency = data.school.currency;
  const s = data.summary;
  if (section === "executive") {
    return `<section><h2>Executive Summary</h2><div class="metrics">${metric("Students", s.students)}${metric("Staff", s.staff)}${metric("Classes", s.classes)}${metric("Capacity Used", percent(s.capacityUsed))}${metric("Attendance", percent(s.attendanceRate))}${metric("Performance", percent(s.performanceAverage))}</div></section>`;
  }
  if (section === "finance") {
    return `<section><h2>Finance Position</h2><div class="metrics">${metric("Billed", money(s.billed, currency))}${metric("Paid", money(s.paid, currency))}${metric("Outstanding", money(s.outstanding, currency))}${metric("Collection Rate", percent(s.collectionRate))}</div></section>`;
  }
  if (section === "payments") {
    return `<section><h2>Payments</h2><div class="metrics">${metric("Collected", money(s.collected, currency))}${metric("Recent Payments", data.rows.payments.length)}${metric("Messages Last 7 Days", s.messagesLast7Days)}</div>${table(["Amount", "Method", "Status", "Date"], data.rows.payments.slice(0, 10).map((row) => [money(asNumber(row.amount), currency), asString(row.payment_method), asString(row.status), formatDate(row.created_at)]))}</section>`;
  }
  if (section === "invoices") {
    return `<section><h2>Invoices & Receivables</h2><div class="metrics">${metric("Invoice Records", data.rows.invoices.length)}${metric("Outstanding", money(s.outstanding, currency))}${metric("Platform Due", money(s.platformDue, currency))}</div>${table(["Invoice", "Total", "Paid", "Outstanding", "Status"], data.rows.invoices.slice(0, 10).map((row) => [asString(row.invoice_number), money(asNumber(row.total_amount), currency), money(asNumber(row.amount_paid), currency), money(asNumber(row.outstanding_balance), currency), asString(row.status)]))}</section>`;
  }
  if (section === "people") {
    return `<section><h2>People & Staffing</h2><div class="metrics">${metric("Total Staff", s.staff)}${metric("Active Staff", s.activeStaff)}${metric("Teachers", s.teachers)}${metric("Pending Leave", s.leavePending)}</div></section>`;
  }
  if (section === "leave") {
    return `<section><h2>Leave Management</h2><div class="metrics">${metric("Leave Requests", s.leaveRequests)}${metric("Pending Leave", s.leavePending)}</div>${table(["Type", "Days", "Status", "Created"], data.rows.leave.slice(0, 10).map((row) => [asString(row.leave_type), asNumber(row.number_of_days), asString(row.status), formatDate(row.created_at)]))}</section>`;
  }
  if (section === "payroll") {
    return `<section><h2>Payroll</h2><div class="metrics">${metric("Net Payroll", money(s.payrollNet, currency))}${metric("Payroll Records", s.payrollRecords)}</div>${table(["Month", "Net", "Deductions", "Status"], data.rows.payroll.slice(0, 10).map((row) => [asString(row.payroll_month), money(asNumber(row.net_salary), currency), money(asNumber(row.deductions), currency), asString(row.status)]))}</section>`;
  }
  if (section === "attendance") {
    return `<section><h2>Attendance</h2><div class="metrics">${metric("30-Day Attendance", percent(s.attendanceRate))}${metric("Today Attendance", percent(s.todayAttendanceRate))}${metric("Absences", s.absent)}</div></section>`;
  }
  if (section === "academics") {
    return `<section><h2>Academics</h2><div class="metrics">${metric("Assessment Records", s.assessments)}${metric("Average Performance", percent(s.performanceAverage))}${metric("Classes", s.classes)}</div>${table(["Class", "Grade", "Capacity"], data.rows.classes.slice(0, 10).map((row) => [asString(row.name), asString(row.grade), asNumber(row.capacity)]))}</section>`;
  }
  if (section === "communications") {
    return `<section><h2>Communications</h2><div class="metrics">${metric("Messages", s.messages)}${metric("Messages Last 7 Days", s.messagesLast7Days)}${metric("Failed Broadcasts", s.failedBroadcasts)}</div>${table(["Broadcast Status", "Count"], data.rows.broadcasts.map((row) => [asString(row.status), asNumber(row.total)]))}</section>`;
  }
  if (section === "governance") {
    return `<section><h2>Governance & Risk</h2><div class="metrics">${metric("Pending Leave", s.leavePending)}${metric("Platform Due", money(s.platformDue, currency))}${metric("Failed Broadcasts", s.failedBroadcasts)}</div>${table(["Audit Status", "Count"], data.rows.audit.map((row) => [asString(row.status), asNumber(row.total)]))}</section>`;
  }
  if (section === "billing") {
    return `<section><h2>Platform Billing</h2><div class="metrics">${metric("Platform Due", money(s.platformDue, currency))}${metric("Platform Invoices", s.platformInvoices)}</div>${table(["Invoice", "Amount", "Currency", "Status", "Due"], data.rows.platformInvoices.map((row) => [asString(row.invoice_number), money(asNumber(row.amount), asString(row.currency, currency)), asString(row.currency, currency), asString(row.status), formatDate(row.due_date)]))}</section>`;
  }
  return "";
}

function renderReport(template: ReportTemplate, data: Awaited<ReturnType<typeof buildReportData>>) {
  if (!data) return "";
  const school = data.school;
  const generated = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(new Date());
  const primaryColor = String(school.primaryColor || "#f97316");
  const secondaryColor = String(school.secondaryColor || "#111827");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(template.title)}</title><style>
    @page{margin:18mm} body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#f8fafc} .page{max-width:980px;margin:0 auto;background:white;padding:38px;box-shadow:0 12px 40px rgba(15,23,42,.08)}
    .page{position:relative;overflow:hidden}.watermark{position:fixed;inset:28%;opacity:.05;z-index:0}.watermark img{width:100%;height:100%;object-fit:contain}.content{position:relative;z-index:1}
    header{display:flex;gap:18px;align-items:center;border-bottom:3px solid ${primaryColor};padding-bottom:18px;margin-bottom:26px}.logo{width:72px;height:72px;border-radius:18px;background:${primaryColor}14;display:flex;align-items:center;justify-content:center;color:${primaryColor};font-size:28px;font-weight:800;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}
    h1{font-size:30px;margin:0;color:#0f172a} h2{font-size:18px;margin:28px 0 12px;color:#0f172a;border-left:5px solid ${primaryColor};padding-left:10px}.muted{color:#64748b;font-size:13px;line-height:1.5}.badge{display:inline-block;background:${primaryColor}12;color:${primaryColor};border:1px solid ${primaryColor}44;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}
    .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0 26px}.meta div,.metric{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:13px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metric span{display:block;font-size:12px;color:#64748b}.metric strong{display:block;font-size:22px;margin-top:5px;color:#0f172a}.metric small{display:block;font-size:11px;color:#64748b;margin-top:3px}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px} th{background:#111827;color:white;text-align:left;padding:10px}td{border-bottom:1px solid #e2e8f0;padding:9px}tr:nth-child(even)td{background:#f8fafc}
    footer{border-top:1px solid #e2e8f0;margin-top:34px;padding-top:16px;display:flex;justify-content:space-between;color:#64748b;font-size:12px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:34px}.sig{border-top:1px solid #94a3b8;padding-top:8px;color:#475569;font-size:12px}@media print{body{background:white}.page{box-shadow:none;padding:0}.no-print{display:none}}
  </style></head><body><main class="page">${school.reportCardWatermarkUrl ? `<div class="watermark"><img src="${escapeHtml(school.reportCardWatermarkUrl)}" alt=""></div>` : ""}<div class="content"><header><div class="logo">${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" alt="">` : escapeHtml(String(school.displayName).slice(0, 2).toUpperCase())}</div><div><span class="badge">${escapeHtml(template.category)} Report</span><h1>${escapeHtml(template.title)}</h1><p class="muted">${escapeHtml(school.displayName)}${school.motto ? ` — ${escapeHtml(school.motto)}` : ""}<br>${escapeHtml(school.address || "")}${school.phone ? ` • ${escapeHtml(school.phone)}` : ""}${school.email ? ` • ${escapeHtml(school.email)}` : ""}${school.website ? ` • ${escapeHtml(school.website)}` : ""}</p></div>${school.schoolSealUrl ? `<div class="logo" style="margin-left:auto"><img src="${escapeHtml(school.schoolSealUrl)}" alt=""></div>` : ""}</header>
  <section class="meta"><div><strong>Cadence</strong><p class="muted">${escapeHtml(template.cadence)}</p></div><div><strong>Audience</strong><p class="muted">${escapeHtml(template.audience)}</p></div><div><strong>Generated</strong><p class="muted">${escapeHtml(generated)}</p></div><div><strong>Currency</strong><p class="muted">${escapeHtml(school.currency)}</p></div></section>
  <p class="muted">${escapeHtml(template.description)}</p>${template.sections.map((section) => renderSection(section, data)).join("")}
  <div class="signatures"><div class="sig">Prepared by / Finance Lead</div><div class="sig">Owner / Director Approval</div></div><footer><span>Generated by Roxan Education System</span><span>${escapeHtml(school.displayName)}</span></footer></div></main></body></html>`;
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const data = await buildReportData(slug);
    if (!data) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantDb = await getTenantDbBySlug(slug);
    const templates = await resolveTemplates(tenantDb);
    return NextResponse.json({ templates, summary: data.summary, school: data.school, generatedAt: data.generatedAt });
  } catch (error) {
    console.error("Owner reports GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const tenantDb = await getTenantDbBySlug(slug);
    const templates = await resolveTemplates(tenantDb);
    const template = templates.find((item) => item.id === asString(body.templateId));
    if (!template) return NextResponse.json({ error: "Valid report template is required" }, { status: 400 });
    const data = await buildReportData(slug);
    if (!data) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const html = renderReport(template, data);
    return NextResponse.json({ template, html, generatedAt: new Date().toISOString(), fileName: `${template.id}-${slug}-${new Date().toISOString().slice(0, 10)}.html` });
  } catch (error) {
    console.error("Owner reports POST failed:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as Row;
    const templateId = asString(body.templateId);
    const tenantDb = await getTenantDbBySlug(slug);
    const settings = await readTemplateSettings(tenantDb);
    const template = sanitizeTemplateUpdate(templateId, body);
    if (!template) return NextResponse.json({ error: "Valid report template is required" }, { status: 400 });
    const deletedIds = new Set(settings.deletedIds || []);
    deletedIds.delete(templateId);
    const nextSettings = {
      overrides: { ...(settings.overrides || {}), [templateId]: template },
      deletedIds: Array.from(deletedIds),
    };
    await writeTemplateSettings(tenantDb, nextSettings);
    return NextResponse.json({ template, templates: await resolveTemplates(tenantDb) });
  } catch (error) {
    console.error("Owner reports PUT failed:", error);
    return NextResponse.json({ error: "Failed to update report template" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const templateId = request.nextUrl.searchParams.get("templateId")?.trim();
    if (!templateId || !REPORT_TEMPLATES.some((item) => item.id === templateId)) return NextResponse.json({ error: "Valid report template is required" }, { status: 400 });
    const tenantDb = await getTenantDbBySlug(slug);
    const settings = await readTemplateSettings(tenantDb);
    const deletedIds = new Set(settings.deletedIds || []);
    deletedIds.add(templateId);
    const overrides = { ...(settings.overrides || {}) };
    delete overrides[templateId];
    await writeTemplateSettings(tenantDb, { overrides, deletedIds: Array.from(deletedIds) });
    return NextResponse.json({ templates: await resolveTemplates(tenantDb) });
  } catch (error) {
    console.error("Owner reports DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete report template" }, { status: 500 });
  }
}
