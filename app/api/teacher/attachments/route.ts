import { NextResponse } from "next/server";
import { getRoleFromHeaders } from "@/lib/teacherAuth";

const EXTERNAL = process.env.EXTERNAL_API_BASE;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const tenant = form.get("tenant")?.toString() ?? "default";
    const role = getRoleFromHeaders(req.headers) || "primary_teacher";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (EXTERNAL) {
      // Forward file to external API (multipart)
      const forwardForm = new FormData();
      forwardForm.append("file", file);
      forwardForm.append("tenant", tenant);
      const prox = await fetch(`${EXTERNAL}/teacher/attachments`, {
        method: "POST",
        body: forwardForm as any,
        headers: { "x-user-role": role },
      });
      const json = await prox.json();
      return NextResponse.json(json, { status: prox.status });
    }

    // Dev/mock behavior: return pretend URL and metadata
    const name = (file as File).name;
    const size = (file as File).size;
    const type = (file as File).type || "application/octet-stream";
    const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const fakeUrl = `https://cdn.example.com/uploads/${encodeURIComponent(tenant)}/${id}/${encodeURIComponent(name)}`;

    const meta = { id, url: fakeUrl, name, size, type, tenant, uploadedAt: new Date().toISOString() };

    return NextResponse.json(meta, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error during upload" }, { status: 500 });
  }
}

