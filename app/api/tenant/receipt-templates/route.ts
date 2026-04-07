import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { receiptTemplatesTable } from "@/lib/db-schema"
import { eq, and, desc } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const templates = await tenantDb
      .select()
      .from(receiptTemplatesTable)
      .where(eq(receiptTemplatesTable.isActive, true))
      .orderBy(desc(receiptTemplatesTable.createdAt))

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching receipt templates:", error)
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, templateData, thumbnail, category, tags } = body

    if (!name || !templateData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [template] = await tenantDb
      .insert(receiptTemplatesTable)
      .values({
        id: crypto.randomUUID(),
        name,
        description,
        templateData,
        thumbnail,
        category: category || "general",
        tags,
        isActive: true,
      })
      .returning()

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error creating receipt template:", error)
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const body = await request.json()
    const { id, name, description, templateData, thumbnail, category, tags, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [updatedTemplate] = await tenantDb
      .update(receiptTemplatesTable)
      .set({
        name,
        description,
        templateData,
        thumbnail,
        category,
        tags,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(receiptTemplatesTable.id, id))
      .returning()

    if (!updatedTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error("Error updating receipt template:", error)
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }
}
