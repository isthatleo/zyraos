import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dataUrlToResponse(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const [, contentType, payload] = match;
  return new NextResponse(Buffer.from(payload, "base64"), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.execute(sql`
    select image
    from "user"
    where id = ${session.user.id}
    limit 1
  `);
  const image = String((result.rows[0] as { image?: string | null } | undefined)?.image || "");

  if (!image) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
  }

  if (image.startsWith("data:image/")) {
    const response = dataUrlToResponse(image);
    if (response) return response;
  }

  if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("/")) {
    return NextResponse.redirect(new URL(image, request.url));
  }

  return NextResponse.json({ error: "Unsupported avatar format" }, { status: 415 });
}
