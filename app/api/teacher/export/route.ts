import { NextResponse } from "next/server";
import { getRoleFromHeaders } from "@/lib/teacherAuth";

const EXTERNAL = process.env.EXTERNAL_API_BASE;

function toCsv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant") || "default";
  const role = getRoleFromHeaders(req.headers) || "primary_teacher";

  if (EXTERNAL) {
    const prox = await fetch(`${EXTERNAL}/teacher/export?tenant=${encodeURIComponent(tenant)}`, {
      headers: { "x-user-role": role },
    });
    const buf = await prox.arrayBuffer();
    return new NextResponse(buf, {
      status: prox.status,
      headers: {
        "content-type": prox.headers.get("content-type") || "text/csv",
        "content-disposition": prox.headers.get("content-disposition") || `attachment; filename="grades-${tenant}.csv"`,
      },
    });
  }

  // Mocked grades to CSV
  const rows = [
    ["tenant", "classId", "className", "studentId", "studentName", "subjectId", "subjectName", "score", "createdAt"],
    ["default", "c1", "Math 101", "st1", "Alice Johnson", "s1", "Algebra", "88", new Date().toISOString()],
    ["default", "c1", "Math 101", "st2", "Bob Smith", "s2", "Geometry", "92", new Date().toISOString()],
  ];
  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="grades-${tenant}.csv"`,
    },
  });
}

