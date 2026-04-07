import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { invoicesTable, schoolsTable } from '@/lib/db-schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const data = await masterDb
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        schoolId: invoicesTable.schoolId,
        amount: invoicesTable.amount,
        currency: invoicesTable.currency,
        status: invoicesTable.status,
        issueDate: invoicesTable.issueDate,
        dueDate: invoicesTable.dueDate,
        description: invoicesTable.description,
        schoolName: schoolsTable.name,
        schoolSlug: schoolsTable.slug,
      })
      .from(invoicesTable)
      .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
      .orderBy(desc(invoicesTable.issueDate));

    const invoices = data.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      school: inv.schoolName || 'Unknown School',
      schoolSlug: inv.schoolSlug,
      date: new Date(inv.issueDate!).toLocaleDateString(),
      amount: parseFloat(inv.amount || '0'),
      currency: inv.currency || 'ZAR',
      status: inv.status || 'pending',
      dueDate: new Date(inv.dueDate!).toLocaleDateString(),
      description: inv.description,
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
