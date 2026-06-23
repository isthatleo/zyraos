import { NextResponse } from "next/server";
import { getRoleFromHeaders } from "@/lib/teacherAuth";

const EXTERNAL = process.env.EXTERNAL_API_BASE;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant") || "default";
  const classId = url.searchParams.get("classId") || "";
  const role = getRoleFromHeaders(req.headers) || "primary_teacher";

  if (EXTERNAL) {
    const prox = await fetch(`${EXTERNAL}/teacher/students?tenant=${encodeURIComponent(tenant)}&classId=${encodeURIComponent(classId)}`, {
      headers: { "x-user-role": role },
    });
    const body = await prox.text();
    return new NextResponse(body, {
      status: prox.status,
      headers: { "content-type": prox.headers.get("content-type") || "application/json" },
    });
  }

  // Mocked students per class
  const map: Record<string, any[]> = {
    c1: [
      { id: "st1", name: "Alice Johnson" },
      { id: "st2", name: "Bob Smith" },
      { id: "st3", name: "Charlie Lee" },
    ],
    c2: [
      { id: "st4", name: "Daisy Miller" },
      { id: "st5", name: "Evan Garcia" },
    ],
  };

  const students = map[classId] ?? [
    { id: "stx1", name: "Student One" },
    { id: "stx2", name: "Student Two" },
  ];

  return NextResponse.json({ tenant, classId, students });
}

