import { NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { rolesTable, rolePermissionsTable, subscriptionPlansTable, platformAdminsTable } from '@/lib/db-schema';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

export async function POST() {
  try {
    console.log('Starting database seeding...');

    // Test connection
    await masterDb.execute('SELECT 1');
    console.log('Database connection successful');

    // Create default roles
    const defaultRoles = [
      {
        id: 'super_admin',
        name: 'Super Admin',
        description: 'Full system access',
        isSystem: true,
      },
      {
        id: 'school_owner',
        name: 'School Owner',
        description: 'School administration and management',
        isSystem: true,
      },
      {
        id: 'school_admin',
        name: 'School Admin',
        description: 'School administration',
        isSystem: true,
      },
      {
        id: 'teacher',
        name: 'Teacher',
        description: 'Teaching staff',
        isSystem: true,
      },
      {
        id: 'lecturer',
        name: 'Lecturer',
        description: 'University lecturer',
        isSystem: true,
      },
      {
        id: 'accountant',
        name: 'Accountant',
        description: 'Financial management',
        isSystem: true,
      },
      {
        id: 'hr',
        name: 'HR Manager',
        description: 'Human resources management',
        isSystem: true,
      },
      {
        id: 'staff',
        name: 'Staff',
        description: 'General staff member',
        isSystem: true,
      },
      {
        id: 'student',
        name: 'Student',
        description: 'Student access',
        isSystem: true,
      },
      {
        id: 'parent',
        name: 'Parent',
        description: 'Parent access',
        isSystem: true,
      },
    ];

    // Insert roles
    for (const role of defaultRoles) {
      try {
        await masterDb.insert(rolesTable).values(role).onConflictDoNothing();
        console.log(`Role ${role.name} inserted`);
      } catch (error) {
        console.log(`Role ${role.name} already exists or error:`, error);
      }
    }

    // Create default permissions
    const rolePermissions = [
      { roleId: 'super_admin', permission: '*', resource: '*' },
      { roleId: 'school_owner', permission: 'read', resource: '*' },
      { roleId: 'school_owner', permission: 'write', resource: 'schools' },
      { roleId: 'school_admin', permission: 'read', resource: '*' },
      { roleId: 'teacher', permission: 'read', resource: 'students' },
      { roleId: 'accountant', permission: 'read', resource: 'finance' },
      { roleId: 'student', permission: 'read', resource: 'profile' },
      { roleId: 'parent', permission: 'read', resource: 'children' },
    ];

    for (const permission of rolePermissions) {
      try {
        await masterDb.insert(rolePermissionsTable).values({
          id: randomUUID(),
          ...permission
        }).onConflictDoNothing();
      } catch (error) {
        console.log(`Permission error:`, error);
      }
    }

    // Create subscription plans
    const subscriptionPlans = [
      {
        id: 'basic',
        name: 'Basic',
        description: 'For small schools up to 100 students',
        price: '50.00',
        features: { students: 100, staff: 10, storage: '5GB' },
        maxStudents: 100,
        maxStaff: 10,
        isActive: true,
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'For medium schools up to 500 students',
        price: '150.00',
        features: { students: 500, staff: 50, storage: '25GB' },
        maxStudents: 500,
        maxStaff: 50,
        isActive: true,
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'For large schools and universities',
        price: '300.00',
        features: { students: null, staff: null, storage: 'Unlimited' },
        maxStudents: null,
        maxStaff: null,
        isActive: true,
      },
    ];

    for (const plan of subscriptionPlans) {
      try {
        await masterDb.insert(subscriptionPlansTable).values(plan).onConflictDoNothing();
        console.log(`Plan ${plan.name} inserted`);
      } catch (error) {
        console.log(`Plan ${plan.name} error:`, error);
      }
    }

    // Create default platform admin
    const platformAdmins = [
      {
        id: 'super-admin-1',
        email: 'leonardlomude@icloud.com',
        name: 'Super Admin',
        role: 'super_admin',
      },
    ];

    for (const admin of platformAdmins) {
      try {
        await masterDb.insert(platformAdminsTable).values(admin).onConflictDoNothing();
        console.log(`Platform admin ${admin.email} inserted`);
      } catch (error) {
        console.log(`Platform admin ${admin.email} error:`, error);
      }
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
