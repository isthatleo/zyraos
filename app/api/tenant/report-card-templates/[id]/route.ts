import { NextRequest, NextResponse } from "next/server"
import {
  reportCardTemplatesTable,
  tenantUsersTable
} from "@/lib/db-schema"
import { eq } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [template] = await tenantDb
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
      .where(eq(reportCardTemplatesTable.id, id))

    if (!template) {
      return NextResponse.json({ error: "Report card template not found" }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error fetching report card template:", error)
    return NextResponse.json({ error: "Failed to fetch report card template" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    } = body

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // If this is set as default, unset other defaults
    if (isDefault) {
      await tenantDb
        .update(reportCardTemplatesTable)
        .set({ isDefault: false })
        .where(eq(reportCardTemplatesTable.isDefault, true))
    }

    const [updatedTemplate] = await tenantDb
      .update(reportCardTemplatesTable)
      .set({
        name,
        description,
        templateData,
        isDefault,
        updatedAt: new Date(),
      })
      .where(eq(reportCardTemplatesTable.id, id))
      .returning()

    if (!updatedTemplate) {
      return NextResponse.json({ error: "Report card template not found" }, { status: 404 })
    }

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error("Error updating report card template:", error)
    return NextResponse.json({ error: "Failed to update report card template" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant card template not found" }, { status: 404 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    const [deletedTemplate] = await tenantDb
      .delete(reportCardTemplatesTable)
      .where(eq(reportCardTemplatesTable.id, id))
      .returning()

    if (!deletedTemplate) {
      return NextResponse.json({ error: "Report card template not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Report card template deleted successfully" })
  } catch (error) {
    console.error("Error deleting report card template:", error)
    return NextResponse.json({ error: "Failed to delete report card template" }, { status: 500 })
  }
}
