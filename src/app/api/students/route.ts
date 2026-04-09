/**
 * Student API Routes
 * Path: src/app/api/students/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { StudentController } from '@/modules/students/student.controller';

const studentController = new StudentController();

/**
 * GET /api/students
 * List students with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    return await studentController.getStudents(request);
  } catch (error) {
    console.error('Error in GET /api/students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/students
 * Create a new student
 */
export async function POST(request: NextRequest) {
  try {
    return await studentController.createStudent(request);
  } catch (error) {
    console.error('Error in POST /api/students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

