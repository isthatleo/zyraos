import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { subscriptionPlansTable } from '@/lib/db-schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const plans = await masterDb
      .select({
        id: subscriptionPlansTable.id,
        name: subscriptionPlansTable.name,
        description: subscriptionPlansTable.description,
        price: subscriptionPlansTable.price,
        features: subscriptionPlansTable.features,
        maxStudents: subscriptionPlansTable.maxStudents,
        maxStaff: subscriptionPlansTable.maxStaff,
        isActive: subscriptionPlansTable.isActive,
      })
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(subscriptionPlansTable.price);

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
