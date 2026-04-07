import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import {
  schoolsTable,
  subscriptionsTable,
  subscriptionPlansTable,
  tenantModulesTable,
  tenantUsersTable,
  rolesTable,
  departmentsTable,
  userTable,
  accountTable,
  invoicesTable
} from '@/lib/db-schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

interface ProvisioningRequest {
  schoolInfo: {
    name: string;
    type: string;
    country: string;
    city: string;
    contactEmail: string;
    phone: string;
    address: string;
    subdomain: string;
    currencyCode?: string;
    currencyName?: string;
    countryCode?: string;
  };
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  };
  planId: string;
  modules: Array<{
    key: string;
    name: string;
    enabled: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProvisioningRequest = await request.json();
    const { schoolInfo, adminUser, planId, modules } = body;

    // Validate required fields
    if (!schoolInfo.name || !schoolInfo.subdomain || !adminUser.email || !adminUser.password || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingSchool = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, schoolInfo.subdomain))
      .limit(1);

    if (existingSchool.length > 0) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Check if admin email is already taken in the main auth system
    const existingUser = await masterDb
      .select()
      .from(userTable)
      .where(eq(userTable.email, adminUser.email))
      .limit(1);

    if (existingUser.length > 0) {
      // Check if this user is already a tenant user
      const existingTenantUser = await masterDb
        .select()
        .from(tenantUsersTable)
        .where(eq(tenantUsersTable.email, adminUser.email))
        .limit(1);

      if (existingTenantUser.length > 0) {
        return NextResponse.json(
          { error: 'Admin email already exists as a school administrator' },
          { status: 409 }
        );
      }
      // If user exists in userTable but not tenantUsersTable, we can potentially reuse them,
      // but for provisioning, it's safer to require a unique email or handle the link.
      // For now, let's keep it strict to avoid collisions in this simplified multi-tenant setup.
      return NextResponse.json(
        { error: 'Admin email already exists in the system' },
        { status: 409 }
      );
    }

    // Get the selected plan
    const planResult = await masterDb
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, planId))
      .limit(1);

    if (planResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }
    const plan = planResult[0];

    // Generate IDs
    const schoolId = crypto.randomUUID();
    const adminUserId = crypto.randomUUID();
    const subscriptionId = crypto.randomUUID();
    
    // For now, use the same database URL (in multi-tenant this would be a separate URL)
    const databaseUrl = process.env.DATABASE_URL!;

    // Start transaction for provisioning
    const result = await masterDb.transaction(async (tx) => {
      // 1. Create school record with country and default currency
      const newSchool = await tx
        .insert(schoolsTable)
        .values({
          id: schoolId,
          name: schoolInfo.name,
          slug: schoolInfo.subdomain,
          country: schoolInfo.country,
          countryCode: schoolInfo.countryCode,
          currencyCode: schoolInfo.currencyCode,
          currencyName: schoolInfo.currencyName,
          type: schoolInfo.type,
          databaseUrl,
          status: 'active',
          subscriptionId: subscriptionId,
        })
        .returning();

      // 2. Create subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      await tx
        .insert(subscriptionsTable)
        .values({
          id: subscriptionId,
          schoolId,
          planId,
          status: 'active',
          startDate,
          endDate,
          autoRenew: true,
        });

      // 3. Create invoice for the subscription
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days payment term

      await tx
        .insert(invoicesTable)
        .values({
          id: invoiceId,
          invoiceNumber,
          schoolId,
          subscriptionId,
          amount: plan.price.toString(),
          currency: schoolInfo.currencyCode || 'ZAR',
          status: 'pending',
          issueDate,
          dueDate,
          description: `Subscription for ${plan.name} plan`,
          notes: `Monthly subscription for ${schoolInfo.name} school`,
        });

      // 4. Create default roles for the school
      const adminRoleId = crypto.randomUUID();
      const systemAdminRoleId = adminRoleId;
      
      const roles = [
        { id: systemAdminRoleId, name: 'School Admin', description: 'Full system access for school administrators', isSystem: true },
        { id: crypto.randomUUID(), name: 'HR Staff', description: 'Human resources management', isSystem: true },
        { id: crypto.randomUUID(), name: 'Accountant', description: 'Financial management', isSystem: true },
        { id: crypto.randomUUID(), name: 'Librarian', description: 'Library management', isSystem: true },
        { id: crypto.randomUUID(), name: 'Student', description: 'Student access', isSystem: true },
        { id: crypto.randomUUID(), name: 'Parent', description: 'Parent access', isSystem: true },
      ];

      for (const role of roles) {
        await tx.insert(rolesTable).values(role);
      }

      // 5. Create default department
      const adminDeptId = crypto.randomUUID();
      await tx
        .insert(departmentsTable)
        .values({
          id: adminDeptId,
          name: 'Administration',
        });

      // 6. Create the platform-wide auth user
      const hashedPassword = crypto
        .createHash('sha256')
        .update(adminUser.password)
        .digest('hex');

      await tx
        .insert(userTable)
        .values({
          id: adminUserId,
          email: adminUser.email,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          role: 'admin',
        });

      await tx
        .insert(accountTable)
        .values({
          id: crypto.randomUUID(),
          userId: adminUserId,
          accountId: adminUser.email,
          providerId: 'credential',
          password: hashedPassword,
        });

      // 7. Create the tenant-specific user record
      await tx
        .insert(tenantUsersTable)
        .values({
          id: adminUserId,
          email: adminUser.email,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          roleId: systemAdminRoleId,
          departmentId: adminDeptId,
          isActive: true,
        });

      // 8. Create tenant modules based on selection
      const moduleInserts = modules
        .filter(module => module.enabled)
        .map(module => ({
          id: crypto.randomUUID(),
          schoolId,
          moduleName: module.name,
          moduleKey: module.key,
          isEnabled: true,
        }));

      if (moduleInserts.length > 0) {
        await tx.insert(tenantModulesTable).values(moduleInserts);
      }

      return {
        school: newSchool[0],
        planName: plan.name,
        adminUser: {
          email: adminUser.email,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
        },
        portalUrl: `https://${schoolInfo.subdomain}.roxan.com`,
        currency: {
          code: schoolInfo.currencyCode,
          name: schoolInfo.currencyName,
        },
        invoice: {
          id: invoiceId,
          invoiceNumber,
          amount: plan.price,
          currency: schoolInfo.currencyCode || 'ZAR',
          status: 'pending',
          dueDate,
        }
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: 'School provisioned successfully with localized settings'
    });

  } catch (error) {
    console.error('Error provisioning school:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
