import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  gradingScalesTable,
} from "@/lib/db-schema"
import { eq, desc, and } from "drizzle-orm"
import { getTenantDbBySlug } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")
    const scaleType = searchParams.get("scaleType")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // Get grading scales
    let whereConditions = []
    if (scaleType) {
      whereConditions.push(eq(gradingScalesTable.scaleType, scaleType))
    }

    const scales = await tenantDb
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
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(gradingScalesTable.createdAt))

    return NextResponse.json({ gradingScales: scales })
  } catch (error) {
    console.error("Error fetching grading scales:", error)
    return NextResponse.json({ error: "Failed to fetch grading scales" }, { status: 500 })
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
      scaleType,
      minScore,
      maxScore,
      grade,
      gradePoint,
      description,
      color,
      isDefault,
    } = body

    if (!name || !scaleType || minScore === undefined || maxScore === undefined || !grade) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug)

    // If this is set as default, unset other defaults
    if (isDefault) {
      await tenantDb
        .update(gradingScalesTable)
        .set({ isDefault: false })
        .where(eq(gradingScalesTable.isDefault, true))
    }

    // Create the grading scale entry
    const [scale] = await tenantDb
      .insert(gradingScalesTable)
      .values({
        id: crypto.randomUUID(),
        name,
        scaleType,
        minScore: minScore ? String(minScore) : "0",
        maxScore: maxScore ? String(maxScore) : "100",
        grade,
        gradePoint: gradePoint ? String(gradePoint) : null,
        description,
        color,
        isDefault: isDefault || false,
        isActive: true,
      })
      .returning()

    return NextResponse.json(scale)
  } catch (error) {
    console.error("Error creating grading scale:", error)
    return NextResponse.json({ error: "Failed to create grading scale" }, { status: 500 })
  }
}
