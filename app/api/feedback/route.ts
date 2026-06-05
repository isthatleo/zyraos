import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensureFeedbackTables() {
  await db.execute(sql`
    create table if not exists user_feedback (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      title text not null,
      message text not null,
      category text not null default 'feature',
      priority text not null default 'normal',
      status text not null default 'open',
      dashboard_area text,
      metadata jsonb,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists feedback_updates (
      id text primary key,
      feedback_id text not null references user_feedback(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      type text not null,
      message text not null,
      state text,
      created_at timestamp not null default now()
    )
  `);
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;
  await ensureFeedbackTables();

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "all";
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const result = await db.execute(sql`
    select
      f.id,
      f.title,
      f.message,
      f.category,
      f.priority,
      f.status,
      f.dashboard_area as "dashboardArea",
      f.metadata,
      f.created_at as "createdAt",
      f.updated_at as "updatedAt",
      u.id as "senderId",
      u.name as "senderName",
      u.email as "senderEmail",
      u.role_id as "senderRole",
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', fu.id,
            'type', fu.type,
            'message', fu.message,
            'state', fu.state,
            'createdAt', fu.created_at,
            'userId', fu.user_id,
            'userName', updater.name
          )
          order by fu.created_at asc
        ) filter (where fu.id is not null),
        '[]'::jsonb
      ) as updates
    from user_feedback f
    join users u on u.id = f.user_id
    left join feedback_updates fu on fu.feedback_id = f.id
    left join users updater on updater.id = fu.user_id
    where (${scope} <> 'mine' or f.user_id = ${currentUser.id})
      and (${status}::text is null or f.status = ${status})
      and (${category}::text is null or f.category = ${category})
    group by f.id, u.id, u.name, u.email, u.role_id
    order by f.updated_at desc
    limit 100
  `);

  return NextResponse.json({ feedback: result.rows, currentUser }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;
  await ensureFeedbackTables();

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const category = String(body.category || "feature");
  const priority = String(body.priority || "normal");
  const dashboardArea = String(body.dashboardArea || "universal");

  if (!title || !message) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  const id = newId("feedback");
  await db.execute(sql`
    insert into user_feedback (id, user_id, title, message, category, priority, status, dashboard_area, metadata, created_at, updated_at)
    values (
      ${id},
      ${currentUser.id},
      ${title},
      ${message},
      ${category},
      ${priority},
      'open',
      ${dashboardArea},
      ${JSON.stringify({ source: "dashboard" })}::jsonb,
      now(),
      now()
    )
  `);

  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;
  await ensureFeedbackTables();

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const status = String(body.status || "");
  const reply = String(body.reply || "").trim();

  if (!id) return NextResponse.json({ error: "Feedback id is required" }, { status: 400 });

  const existing = await db.execute(sql`select id, status from user_feedback where id = ${id} limit 1`);
  if (!existing.rows[0]) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });

  if (status) {
    await db.execute(sql`update user_feedback set status = ${status}, updated_at = now() where id = ${id}`);
    await db.execute(sql`
      insert into feedback_updates (id, feedback_id, user_id, type, message, state, created_at)
      values (${newId("fbu")}, ${id}, ${currentUser.id}, 'state_change', ${`Feedback state changed to ${status}`}, ${status}, now())
    `);
  }

  if (reply) {
    await db.execute(sql`
      insert into feedback_updates (id, feedback_id, user_id, type, message, state, created_at)
      values (${newId("fbu")}, ${id}, ${currentUser.id}, 'reply', ${reply}, ${status || null}, now())
    `);
    await db.execute(sql`update user_feedback set updated_at = now() where id = ${id}`);
  }

  return NextResponse.json({ success: true });
}
