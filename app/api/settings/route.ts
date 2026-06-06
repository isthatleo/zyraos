import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function text(value: unknown, fallback: string, max = 120) {
  const next = String(value || fallback).trim();
  return next.slice(0, max) || fallback;
}

function enumValue(value: unknown, allowed: string[], fallback: string) {
  const next = String(value || "").trim();
  return allowed.includes(next) ? next : fallback;
}

function validateTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

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
    emailNotifications: bool(body.emailNotifications, true),
    smsNotifications: bool(body.smsNotifications, true),
    inAppNotifications: bool(body.inAppNotifications, true),
    broadcastNotifications: bool(body.broadcastNotifications, true),
    paymentNotifications: bool(body.paymentNotifications, true),
  };
  const quietHoursStart = text(body.quietHoursStart, "20:00", 5);
  const quietHoursEnd = text(body.quietHoursEnd, "07:00", 5);
  const sessionTimeout = Number(body.sessionTimeout || 30);

  if (!validateTime(quietHoursStart) || !validateTime(quietHoursEnd)) {
    return NextResponse.json({ error: "Quiet hours must use HH:mm format" }, { status: 400 });
  }
  if (!Number.isFinite(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 480) {
    return NextResponse.json({ error: "Session timeout must be between 5 and 480 minutes" }, { status: 400 });
  }

  const preferences = {
    quietHoursEnabled: bool(body.quietHoursEnabled),
    quietHoursStart,
    quietHoursEnd,
    digestFrequency: enumValue(body.digestFrequency, ["instant", "daily", "weekly"], "daily"),
    dashboardDensity: enumValue(body.dashboardDensity, ["compact", "comfortable", "spacious"], "comfortable"),
    defaultLandingPage: enumValue(body.defaultLandingPage, ["dashboard", "messages", "calendar", "profile"], "dashboard"),
    academicCalendarView: enumValue(body.academicCalendarView, ["day", "week", "month", "term"], "week"),
    gradePrivacyMode: bool(body.gradePrivacyMode),
    guardianVisibility: bool(body.guardianVisibility, true),
    attendanceAlerts: bool(body.attendanceAlerts, true),
    financeApprovals: bool(body.financeApprovals, true),
    dataExportFormat: enumValue(body.dataExportFormat, ["csv", "xlsx", "pdf", "json"], "csv"),
    sessionTimeout: String(sessionTimeout),
    pushNotifications: bool(body.pushNotifications, true),
    whatsappNotifications: bool(body.whatsappNotifications),
    soundEffects: bool(body.soundEffects, true),
    reducedMotion: bool(body.reducedMotion),
    highContrast: bool(body.highContrast),
    autoMarkMessagesRead: bool(body.autoMarkMessagesRead, true),
    showOnlineStatus: bool(body.showOnlineStatus, true),
    twoStepPrompt: bool(body.twoStepPrompt),
    loginAlerts: bool(body.loginAlerts, true),
    trustedDeviceRememberDays: enumValue(body.trustedDeviceRememberDays, ["0", "7", "30", "90"], "30"),
    timezone: text(body.timezone, "Africa/Kampala", 80),
    locale: text(body.locale, "en-UG", 20),
    phone: text(body.phone, "", 40),
    country: text(body.country, "", 80),
    city: text(body.city, "", 80),
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

  return NextResponse.json({ settings, preferences }, { headers: { "Cache-Control": "no-store" } });
}
