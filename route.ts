import { masterDb } from '@/lib/db';
import { classesTable, subjectsTable } from '@/lib/db-schema';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  let data;
  switch (type) {
    case 'classes':
      data = await masterDb.select().from(classesTable);
      break;
    case 'subjects':
      data = await masterDb.select().from(subjectsTable);
      break;
    // Add other cases for exams, attendance, and grades...
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return NextResponse.json(data);
}
