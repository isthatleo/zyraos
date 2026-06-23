import { NextResponse } from "next/server";
import { getRoleFromHeaders } from "@/lib/teacherAuth";

const EXTERNAL = process.env.EXTERNAL_API_BASE;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant") || "default";
  const role = getRoleFromHeaders(req.headers) || "primary_teacher";

  if (EXTERNAL) {
	const prox = await fetch(`${EXTERNAL}/teacher/grades?tenant=${encodeURIComponent(tenant)}`, {
	  headers: { "x-user-role": role },
	});
	const body = await prox.text();
	return new NextResponse(body, {
	  status: prox.status,
	  headers: { "content-type": prox.headers.get("content-type") || "application/json" },
	});
  }

  // Mock
  return NextResponse.json({
	tenant,
	classes: [
	  { id: "c1", name: "Math 101", average: "B" },
	  { id: "c2", name: "Science 7A", average: "B+" },
	],
	recent: [{ id: "g1", classId: "c1", subjectId: "s1", studentId: "st1", score: 88 }],
  });
}

export async function POST(req: Request) {
  const role = getRoleFromHeaders(req.headers) || "primary_teacher";
  const body = await req.json().catch(() => null);

  if (!body) {
	return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenant, classId, subjectId, studentId, score, comments } = body;

  if (!tenant || !classId || !subjectId || !studentId || (score === undefined || score === null)) {
	return NextResponse.json({ error: "Missing required fields (tenant, classId, subjectId, studentId, score)" }, { status: 400 });
  }

  if (typeof score !== "number" || score < 0 || score > 100) {
	return NextResponse.json({ error: "Score must be a number between 0 and 100" }, { status: 400 });
  }

  if (EXTERNAL) {
	const prox = await fetch(`${EXTERNAL}/teacher/grades`, {
	  method: "POST",
	  headers: { "content-type": "application/json", "x-user-role": role },
	  body: JSON.stringify(body),
	});
	const responseText = await prox.text();
	return new NextResponse(responseText, {
	  status: prox.status,
	  headers: { "content-type": prox.headers.get("content-type") || "application/json" },
	});
  }

  // Mocked creation response
  const created = {
	id: `grade-${Date.now()}`,
	tenant,
	classId,
	subjectId,
	studentId,
	score,
	comments: comments ?? null,
	createdAt: new Date().toISOString(),
  };

  return NextResponse.json(created, { status: 201 });
}
