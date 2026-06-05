import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { masterDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    task,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Database health check timed out")), timeoutMs);
    }),
  ]);
}

export async function GET() {
  try {
    await withTimeout(masterDb.execute(sql`select 1`), 15000);
    return NextResponse.json({ ok: true, status: "available" });
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : null;
    const causeMessage = cause instanceof Error ? cause.message : null;
    const message = causeMessage || (error instanceof Error ? error.message : "Database health check failed");

    return NextResponse.json({
      ok: false,
      status: "unavailable",
      error: message,
    });
  }
}
