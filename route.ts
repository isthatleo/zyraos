import { masterDb } from '@/lib/db';
import { classesTable, subjectsTable, gradebookTable, attendanceTable } from '@/lib/db-schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const schoolId = searchParams.get('schoolId');

  if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 });

  let data;
  switch (type) {
    case 'classes':
      data = await masterDb.select().from(classesTable).where(eq(classesTable.schoolId, schoolId));
      break;
    case 'subjects':
      data = await masterDb.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId));
      break;
    // Add other cases for exams, attendance, and grades...
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return NextResponse.json(data);
}