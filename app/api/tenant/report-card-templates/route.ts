import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  reportCardTemplatesTable,
  tenantUsersTable
} from "@/lib/db-schema"
import { eq, desc } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Get report card templates
    const templates = await tenantDb
      .select({
        id: reportCardTemplatesTable.id,
        name: reportCardTemplatesTable.name,
        description: reportCardTemplatesTable.description,
        templateData: reportCardTemplatesTable.templateData,
        isDefault: reportCardTemplatesTable.isDefault,
        createdBy: reportCardTemplatesTable.createdBy,
        createdByName: tenantUsersTable.name,
        createdAt: reportCardTemplatesTable.createdAt,
        updatedAt: reportCardTemplatesTable.updatedAt,
      })
      .from(reportCardTemplatesTable)
      .leftJoin(tenantUsersTable, eq(reportCardTemplatesTable.createdBy, tenantUsersTable.id))
      .orderBy(desc(reportCardTemplatesTable.createdAt))

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error fetching report card templates:", error)
    return NextResponse.json({ error: "Failed to fetch report card templates" }, { status: 500 })
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
    const {
      name,
      description,
      templateData,
      isDefault,
      createdBy,
    } = body

    if (!name || !templateData || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // If this is set as default, unset other defaults
    if (isDefault) {
      await tenantDb
        .update(reportCardTemplatesTable)
        .set({ isDefault: false })
        .where(eq(reportCardTemplatesTable.isDefault, true))
    }

    const [template] = await tenantDb
      .insert(reportCardTemplatesTable)
      .values({
        id: crypto.randomUUID(),
        name,
        description,
        templateData,
        thumbnail: null,
        isDefault: isDefault || false,
        isActive: true,
        gradeLevel: null,
        createdBy,
        category: "general",
        tags: null,
      })
      .returning()

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error creating report card template:", error)
    return NextResponse.json({ error: "Failed to create report card template" }, { status: 500 })
  }
}
