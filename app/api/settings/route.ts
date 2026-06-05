import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  await db.execute(sql`
    insert into notification_settings (
      id,
      user_id,
      email_notifications,
      sms_notifications,
      in_app_notifications,
      broadcast_notifications,
      payment_notifications,
      created_at,
      updated_at
    )
    values (${newId("settings")}, ${currentUser.id}, true, true, true, true, true, now(), now())
    on conflict (user_id) do nothing
  `);

  const result = await db.execute(sql`
    select
      email_notifications as "emailNotifications",
      sms_notifications as "smsNotifications",
      in_app_notifications as "inAppNotifications",
      broadcast_notifications as "broadcastNotifications",
      payment_notifications as "paymentNotifications"
    from notification_settings
    where user_id = ${currentUser.id}
    limit 1
  `);

  const preferencesResult = await db.execute(sql`
    select value
    from system_settings
    where key = ${`user_settings:${currentUser.id}`}
    limit 1
  `);

  return NextResponse.json(
    {
      settings: result.rows[0],
      preferences: (preferencesResult.rows[0] as { value?: Record<string, unknown> } | undefined)?.value || {},
      currentUser,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const body = await request.json().catch(() => ({}));
  const settings = {
    emailNotifications: Boolean(body.emailNotifications),
    smsNotifications: Boolean(body.smsNotifications),
    inAppNotifications: Boolean(body.inAppNotifications),
    broadcastNotifications: Boolean(body.broadcastNotifications),
    paymentNotifications: Boolean(body.paymentNotifications),
  };
  const preferences = {
    quietHoursEnabled: Boolean(body.quietHoursEnabled),
    quietHoursStart: String(body.quietHoursStart || "20:00"),
    quietHoursEnd: String(body.quietHoursEnd || "07:00"),
    digestFrequency: String(body.digestFrequency || "daily"),
    dashboardDensity: String(body.dashboardDensity || "comfortable"),
    defaultLandingPage: String(body.defaultLandingPage || "dashboard"),
    academicCalendarView: String(body.academicCalendarView || "week"),
    gradePrivacyMode: Boolean(body.gradePrivacyMode),
    guardianVisibility: Boolean(body.guardianVisibility ?? true),
    attendanceAlerts: Boolean(body.attendanceAlerts ?? true),
    financeApprovals: Boolean(body.financeApprovals ?? true),
    dataExportFormat: String(body.dataExportFormat || "csv"),
    sessionTimeout: String(body.sessionTimeout || "30"),
  };

  await db.execute(sql`
    insert into notification_settings (
      id,
      user_id,
      email_notifications,
      sms_notifications,
      in_app_notifications,
      broadcast_notifications,
      payment_notifications,
      created_at,
      updated_at
    )
    values (
      ${newId("settings")},
      ${currentUser.id},
      ${settings.emailNotifications},
      ${settings.smsNotifications},
      ${settings.inAppNotifications},
      ${settings.broadcastNotifications},
      ${settings.paymentNotifications},
      now(),
      now()
    )
    on conflict (user_id) do update set
      email_notifications = excluded.email_notifications,
      sms_notifications = excluded.sms_notifications,
      in_app_notifications = excluded.in_app_notifications,
      broadcast_notifications = excluded.broadcast_notifications,
      payment_notifications = excluded.payment_notifications,
      updated_at = now()
  `);

  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (
      ${newId("settings")},
      ${`user_settings:${currentUser.id}`},
      ${JSON.stringify(preferences)}::jsonb,
      'user',
      ${`Dashboard preferences for ${currentUser.email}`},
      now(),
      now()
    )
    on conflict (key) do update set
      value = excluded.value,
      updated_at = now()
  `);

  return NextResponse.json({ settings, preferences });
}
