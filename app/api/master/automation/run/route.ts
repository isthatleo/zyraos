import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

import { masterDb } from "@/lib/db";
import { auditLogsTable, platformAdminsTable } from "@/lib/db-schema";
import { asBoolean, asNumber, asString, getPlatformSettings } from "@/lib/platform-settings-server";
import { updateNeonBackupSchedule } from "@/lib/platform-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSystemAdminId() {
  const [admin] = await masterDb.select({ id: platformAdminsTable.id }).from(platformAdminsTable).limit(1);
  return admin?.id || "system";
}

function authorize(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("x-cron-secret") === cronSecret || request.nextUrl.searchParams.get("token") === cronSecret;
}

async function auditRun(summary: Record<string, unknown>, dryRun: boolean, request: NextRequest) {
  await masterDb.insert(auditLogsTable).values({
    id: crypto.randomUUID(),
    adminId: await getSystemAdminId(),
    action: dryRun ? "Platform Automation Previewed" : "Platform Automation Run",
    resource: "platform_automation",
    resourceId: "scheduled-policy",
    changes: summary,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent"),
    status: "success",
    createdAt: new Date(),
  });
}

async function executeAutomation(request: NextRequest, dryRun: boolean) {
  const settings = await getPlatformSettings();
  if (!asBoolean(settings.automationEnabled, true)) {
    const summary = {
      skipped: true,
      reason: "automation_disabled",
      nightlyJobWindow: asString(settings.nightlyJobWindow, "02:00-04:00"),
      generatedAt: new Date().toISOString(),
    };
    await auditRun(summary, true, request);
    return summary;
  }

  const paymentGraceDays = Math.max(0, asNumber(settings.paymentGraceDays, 7));
  const renewalNoticeDays = Math.max(1, asNumber(settings.subscriptionRenewalNoticeDays, 14));
  const auditRetentionDays = Math.max(1, asNumber(settings.auditRetentionDays, 365));
  const retentionPeriod = Math.max(1, asNumber(settings.retentionPeriod, 30));
  const autoSuspend = asBoolean(settings.autoSuspendOverdueTenants, false);
  const autoNotifyInactiveTenants = asBoolean(settings.autoNotifyInactiveTenants, true);

  const overdueCandidates = await masterDb.execute(sql`
    select id, invoice_number as "invoiceNumber", school_id as "schoolId", due_date as "dueDate"
    from invoices
    where status = 'pending' and due_date < now()
  `);

  let markedOverdue = [] as Array<Record<string, unknown>>;
  if (!dryRun && overdueCandidates.rows.length) {
    const result = await masterDb.execute(sql`
      update invoices
      set status = 'overdue', updated_at = now()
      where status = 'pending' and due_date < now()
      returning id, invoice_number as "invoiceNumber", school_id as "schoolId", due_date as "dueDate"
    `);
    markedOverdue = result.rows as Array<Record<string, unknown>>;
  }

  const suspensionCandidates = await masterDb.execute(sql`
    select distinct s.id, s.name, s.slug
    from schools s
    inner join invoices i on i.school_id = s.id
    where s.status <> 'suspended'
      and i.status = 'overdue'
      and i.due_date <= now() - (${paymentGraceDays} * interval '1 day')
  `);

  let suspendedSchools = [] as Array<Record<string, unknown>>;
  if (!dryRun && autoSuspend && suspensionCandidates.rows.length) {
    const result = await masterDb.execute(sql`
      update schools
      set status = 'suspended', updated_at = now()
      where status <> 'suspended'
        and id in (
          select distinct school_id
          from invoices
          where status = 'overdue'
            and due_date <= now() - (${paymentGraceDays} * interval '1 day')
        )
      returning id, name, slug
    `);
    suspendedSchools = result.rows as Array<Record<string, unknown>>;

    if (suspendedSchools.length) {
      await masterDb.execute(sql`
        update subscriptions
        set status = 'past_due', updated_at = now()
        where school_id in (${sql.join(suspendedSchools.map((school) => sql`${school.id}`), sql`, `)})
          and status = 'active'
      `);
    }
  }

  const renewalWindow = await masterDb.execute(sql`
    select sub.id, sub.school_id as "schoolId", sub.end_date as "endDate", s.name as "schoolName", sp.name as "planName"
    from subscriptions sub
    left join schools s on s.id = sub.school_id
    left join subscription_plans sp on sp.id = sub.plan_id
    where sub.status = 'active'
      and sub.end_date is not null
      and sub.end_date between now() and now() + (${renewalNoticeDays} * interval '1 day')
    order by sub.end_date asc
  `);

  const inactiveTenants = autoNotifyInactiveTenants
    ? await masterDb.execute(sql`
        select id, name, slug, updated_at as "updatedAt"
        from schools
        where status = 'active'
          and updated_at < now() - (${retentionPeriod} * interval '1 day')
        order by updated_at asc
      `)
    : { rows: [] };

  const auditRetention = await masterDb.execute(sql`
    select count(*)::int as count
    from audit_logs
    where created_at < now() - (${auditRetentionDays} * interval '1 day')
  `);
  const backupSchedule = dryRun
    ? {
        ok: false,
        provider: "neon",
        status: "configured",
        message: "Dry run only. Execute automation to update the Neon backup schedule.",
        checkedAt: new Date().toISOString(),
      }
    : await updateNeonBackupSchedule();

  const summary = {
    dryRun,
    generatedAt: new Date().toISOString(),
    policies: {
      paymentGraceDays,
      renewalNoticeDays,
      auditRetentionDays,
      retentionPeriod,
      autoSuspendOverdueTenants: autoSuspend,
      autoNotifyInactiveTenants,
      backupFrequency: asString(settings.backupFrequency, "daily"),
      tenantBackupPolicy: asString(settings.tenantBackupPolicy, "daily"),
      nightlyJobWindow: asString(settings.nightlyJobWindow, "02:00-04:00"),
    },
    overdueInvoices: {
      candidates: overdueCandidates.rows,
      marked: dryRun ? [] : markedOverdue,
    },
    tenantSuspension: {
      enabled: autoSuspend,
      candidates: suspensionCandidates.rows,
      suspended: dryRun || !autoSuspend ? [] : suspendedSchools,
    },
    renewalNoticesDue: renewalWindow.rows,
    inactiveTenantsDueForNotification: inactiveTenants.rows,
    auditRetentionCandidates: Number((auditRetention.rows[0] as { count?: number } | undefined)?.count || 0),
    backupPolicy: {
      status: backupSchedule.status,
      provider: backupSchedule.provider,
      message: backupSchedule.message,
      result: backupSchedule,
    },
  };

  await auditRun(summary, dryRun, request);
  return summary;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await executeAutomation(request, true), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Automation preview failed:", error);
    return NextResponse.json({ error: "Automation preview failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await executeAutomation(request, false), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Automation run failed:", error);
    return NextResponse.json({ error: "Automation run failed" }, { status: 500 });
  }
}
