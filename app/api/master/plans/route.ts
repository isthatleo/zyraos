import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db'; // Assuming masterDb is configured for tenant-specific access or a tenantDb exists
import { classesTable } from '@/lib/db-schema'; // Assuming classesTable is defined in your schema
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// GET /api/tenant/classes
// Fetches all classes for the current tenant (school)
export async function GET(request: NextRequest) {
  try {
    // In a real multi-tenant app, you'd extract tenantId from auth or subdomain
    // For this example, let's assume a tenantId is passed as a query param or from auth context
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId'); // Replace with actual tenant context

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const classes = await masterDb.query.classesTable.findMany({
      where: eq(classesTable.tenantId, tenantId), // Assuming classesTable has a tenantId column
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/tenant/classes
// Creates a new class for the current tenant (school)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, grade, capacity, teacherId, tenantId } = body; // Include tenantId in the body for this example

    // In a real multi-tenant app, tenantId would come from auth context
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!name || !grade || !capacity || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields: name, grade, capacity, teacherId' }, { status: 400 });
    }

    const newClassId = crypto.randomUUID();

    const [newClass] = await masterDb.insert(classesTable).values({
      id: newClassId,
      tenantId: tenantId, // Associate with the tenant
      name,
      grade,
      capacity,
      enrolledStudents: 0, // Default to 0
      teacherId,
      status: 'active', // Default status
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}