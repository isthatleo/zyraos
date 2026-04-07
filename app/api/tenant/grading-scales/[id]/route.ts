import { NextRequest, NextResponse } from "next/server"
import {
  gradingScalesTable,
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

    // Get grading scale
    const [scale] = await tenantDb
      .select({
        id: gradingScalesTable.id,
        name: gradingScalesTable.name,
        scaleType: gradingScalesTable.scaleType,
        minScore: gradingScalesTable.minScore,
        maxScore: gradingScalesTable.maxScore,
        grade: gradingScalesTable.grade,
        gradePoint: gradingScalesTable.gradePoint,
        description: gradingScalesTable.description,
        color: gradingScalesTable.color,
        isDefault: gradingScalesTable.isDefault,
        isActive: gradingScalesTable.isActive,
        createdAt: gradingScalesTable.createdAt,
        updatedAt: gradingScalesTable.updatedAt,
      })
      .from(gradingScalesTable)
      .where(eq(gradingScalesTable.id, id))

    if (!scale) {
      return NextResponse.json({ error: "Grading scale not found" }, { status: 404 })
    }

    return NextResponse.json(scale)
  } catch (error) {
    console.error("Error fetching grading scale:", error)
    return NextResponse.json({ error: "Failed to fetch grading scale" }, { status: 500 })
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
      scaleType,
      minScore,
      maxScore,
      grade,
      gradePoint,
      description,
      color,
      isDefault,
      isActive,
    } = body

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // If this is set as default, unset other defaults
    if (isDefault) {
      await tenantDb
        .update(gradingScalesTable)
        .set({ isDefault: false })
        .where(eq(gradingScalesTable.isDefault, true))
    }

    // Update the grading scale
    const [updatedScale] = await tenantDb
      .update(gradingScalesTable)
      .set({
        name,
        scaleType,
        minScore: minScore ? String(minScore) : undefined,
        maxScore: maxScore ? String(maxScore) : undefined,
        grade,
        gradePoint: gradePoint ? String(gradePoint) : null,
        description,
        color,
        isDefault,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(gradingScalesTable.id, id))
      .returning()

    if (!updatedScale) {
      return NextResponse.json({ error: "Grading scale not found" }, { status: 404 })
    }

    return NextResponse.json(updatedScale)
  } catch (error) {
    console.error("Error updating grading scale:", error)
    return NextResponse.json({ error: "Failed to update grading scale" }, { status: 500 })
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
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)


    // Delete the grading scale
    const [deletedScale] = await tenantDb
      .delete(gradingScalesTable)
      .where(eq(gradingScalesTable.id, id))
      .returning()

    if (!deletedScale) {
      return NextResponse.json({ error: "Grading scale not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Grading scale deleted successfully" })
  } catch (error) {
    console.error("Error deleting grading scale:", error)
    return NextResponse.json({ error: "Failed to delete grading scale" }, { status: 500 })
  }
}
