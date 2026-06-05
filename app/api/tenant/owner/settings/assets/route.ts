import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ASSET_FIELDS = new Set(["logoUrl", "faviconUrl", "schoolSealUrl", "reportCardWatermarkUrl", "emailHeaderLogoUrl", "loginScreenLogoUrl", "mobileAppLogoUrl"]);

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  if (file.type === "image/svg+xml") return "svg";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("icon")) return "ico";
  return "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });

    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;

    const formData = await request.formData();
    const field = String(formData.get("field") || "");
    const file = formData.get("file");

    if (!ASSET_FIELDS.has(field)) {
      return NextResponse.json({ error: "Unsupported branding asset field" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Asset file is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, WEBP, SVG, and ICO images are supported" }, { status: 415 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Branding asset must be 4MB or smaller" }, { status: 413 });
    }

    const ext = extensionFor(file);
    const safeName = `${field}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const relativeDir = `/uploads/tenants/${slug}/branding`;
    const targetDir = path.join(process.cwd(), "public", "uploads", "tenants", slug, "branding");
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      field,
      url: `${relativeDir}/${safeName}`,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      uploadedBy: currentUser.userId,
    });
  } catch (error) {
    console.error("Tenant branding asset upload failed:", error);
    return NextResponse.json({ error: "Failed to upload branding asset" }, { status: 500 });
  }
}
