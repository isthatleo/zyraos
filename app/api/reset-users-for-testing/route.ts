import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userTable, sessionTable, accountTable, verificationTable } from '@/lib/db-schema';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST() {
  try {
    console.log('Starting user reset for testing...');

    // Test connection
    await db.execute(sql`SELECT 1`);
    console.log('Database connection successful');

    // Delete users from auth tables in order of foreign key dependencies
    console.log('Deleting users from database...');
    
    await db.delete(sessionTable);
    console.log('Deleted all sessions');
    
    await db.delete(accountTable);
    console.log('Deleted all accounts');
    
    await db.delete(verificationTable);
    console.log('Deleted all verifications');
    
    await db.delete(userTable);
    console.log('Deleted all users');

    // Create a test super admin user
    const adminId = randomUUID();
    const testAdmin = {
      id: adminId,
      email: 'admin@test.com',
      emailVerified: true,
      name: 'Test Admin',
      image: null,
      role: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(userTable).values(testAdmin);
    console.log(`Created test super admin: ${testAdmin.email}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Database users reset successfully for testing',
      testAdminEmail: 'admin@test.com',
      testAdminPassword: 'Please set a password via the auth system or use magic link if configured.',
      note: 'The first user (admin@test.com) has been created as a super admin with role=super_admin'
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST method to reset users' },
    { status: 405 }
  );
}


