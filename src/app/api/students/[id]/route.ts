/**
 * Student API Routes - Dynamic
 * Path: src/app/api/students/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { StudentController } from '@/modules/students/student.controller';

const studentController = new StudentController();

/**
 * GET /api/students/[id]
 * Get a specific student by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await studentController.getStudentById(request, params.id);
  } catch (error) {
    console.error(`Error in GET /api/students/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/students/[id]
 * Update a specific student
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await studentController.updateStudent(request, params.id);
  } catch (error) {
    console.error(`Error in PUT /api/students/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/students/[id]
 * Delete a specific student
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await studentController.deleteStudent(request, params.id);
  } catch (error) {
    console.error(`Error in DELETE /api/students/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

