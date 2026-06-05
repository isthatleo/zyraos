import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb, masterDb } from '@/lib/db';
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
  invoicesTable,
  passwordSecurityTable
} from '@/lib/db-schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { getTenantRoleDefinitions, normalizeEducationLevel } from '@/lib/roles';
import { generateTemporaryPassword, hashCredentialPassword, validatePasswordPolicy } from '@/lib/password-access';
import { addDays, buildInvoiceNumber, getInvoicePolicy, getPlatformSettings, asString } from '@/lib/platform-settings-server';
import { requireMasterAdmin, writeMasterAudit } from '@/lib/master-audit';
import { getTenantPortalUrl, validateTenantSlug } from '@/lib/tenant-url';
import { provisionTenantDatabase } from '@/lib/tenant-database-provisioning';
import { deliverProvisioningHandoff } from '@/lib/provisioning-delivery';

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
    password?: string;
  };
  planId: string;
  modules: Array<{
    key: string;
    name: string;
    enabled: boolean;
  }>;
}

function getPlanCurrency(features: unknown, fallback: string) {
  if (features && typeof features === 'object' && !Array.isArray(features)) {
    const currency = String((features as Record<string, unknown>).currency || '').trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(currency)) return currency;
  }
  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body: ProvisioningRequest = await request.json();
    const { schoolInfo, adminUser, planId, modules } = body;
    const settings = await getPlatformSettings();
    const invoicePolicy = getInvoicePolicy(settings);
    const { slug, error: slugError } = validateTenantSlug(schoolInfo.subdomain || schoolInfo.name);

    // Validate required fields
    const temporaryPassword = adminUser.password || generateTemporaryPassword();

    if (!schoolInfo.name || !adminUser.email || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (slugError) {
      return NextResponse.json({ error: slugError, slug }, { status: 400 });
    }

    const passwordError = validatePasswordPolicy(temporaryPassword);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingSchool = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, slug))
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
    const invoiceCurrency = getPlanCurrency(plan.features, invoicePolicy.currency);

    // Generate IDs
    const schoolId = crypto.randomUUID();
    const adminUserId = crypto.randomUUID();
    const subscriptionId = crypto.randomUUID();
    
    const tenantDatabase = await provisionTenantDatabase(slug, settings);
    const databaseUrl = tenantDatabase.databaseUrl;
    const tenantBaseUrl = getTenantPortalUrl(slug, request, asString(settings.tenantUrlMode, "auto"));

    // Start transaction for provisioning
    const result = await masterDb.transaction(async (tx) => {
      // 1. Create school record with country and default currency
      const newSchool = await tx
        .insert(schoolsTable)
        .values({
          id: schoolId,
          name: schoolInfo.name,
          slug,
          country: schoolInfo.country,
          countryCode: schoolInfo.countryCode,
          currencyCode: schoolInfo.currencyCode || invoicePolicy.currency,
          currencyName: schoolInfo.currencyName,
          type: schoolInfo.type,
          databaseUrl,
          status: asString(settings.defaultSchoolStatus, 'active') || 'active',
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
      const invoiceNumber = buildInvoiceNumber(invoicePolicy.prefix);
      const issueDate = new Date();
      const dueDate = addDays(issueDate, invoicePolicy.dueDays);
      const taxNote = invoicePolicy.taxRate > 0 ? ` ${invoicePolicy.taxLabel} policy: ${invoicePolicy.taxRate}%.` : '';

      await tx
        .insert(invoicesTable)
        .values({
          id: invoiceId,
          invoiceNumber,
          schoolId,
          subscriptionId,
          amount: plan.price.toString(),
          currency: invoiceCurrency,
          status: 'pending',
          issueDate,
          dueDate,
          description: `Subscription for ${plan.name} plan`,
          notes: `Subscription invoice for ${schoolInfo.name}.${taxNote}`,
        });

      // 4. Create tenant roles based on the selected education level.
      const educationLevel = normalizeEducationLevel(schoolInfo.type);
      const tenantRoles = getTenantRoleDefinitions(educationLevel);
      const ownerRole = tenantRoles.find((role) => role.canonicalRole === 'owner') || tenantRoles[0];

      for (const role of tenantRoles) {
        await tx
          .insert(rolesTable)
          .values({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
          })
          .onConflictDoNothing();
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
      const hashedPassword = await hashCredentialPassword(temporaryPassword);

      await tx
        .insert(userTable)
        .values({
          id: adminUserId,
          email: adminUser.email,
          emailVerified: true,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          role: 'owner',
        });

      await tx
        .insert(accountTable)
        .values({
          id: crypto.randomUUID(),
          userId: adminUserId,
          accountId: adminUserId,
          providerId: 'credential',
          password: hashedPassword,
        });

      await tx
        .insert(passwordSecurityTable)
        .values({
          userId: adminUserId,
          tenantSlug: slug,
          forcePasswordChange: true,
          temporaryPasswordIssuedAt: new Date(),
          reason: 'school_provisioning_admin_setup',
        })
        .onConflictDoUpdate({
          target: passwordSecurityTable.userId,
          set: {
            tenantSlug: slug,
            forcePasswordChange: true,
            temporaryPasswordIssuedAt: new Date(),
            reason: 'school_provisioning_admin_setup',
            updatedAt: new Date(),
          },
        });

      // 7. Create the tenant-specific user record
      await tx
        .insert(tenantUsersTable)
        .values({
          id: adminUserId,
          email: adminUser.email,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          roleId: ownerRole.id,
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
        tenantSeed: {
          roles: tenantRoles,
          ownerRoleId: ownerRole.id,
          adminDeptId,
          adminUserId,
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
          adminEmail: adminUser.email,
        },
        adminUser: {
          email: adminUser.email,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
        },
        temporaryPassword,
        portalUrl: `${tenantBaseUrl}/admins`,
        tenantLoginUrl: `${tenantBaseUrl}/staff`,
        slug,
        database: {
          mode: tenantDatabase.mode,
          provider: tenantDatabase.provider,
          isolated: tenantDatabase.isolated,
          branchId: tenantDatabase.branchId,
          endpointId: tenantDatabase.endpointId,
          databaseName: tenantDatabase.databaseName,
          message: tenantDatabase.message,
        },
        currency: {
          code: schoolInfo.currencyCode,
          name: schoolInfo.currencyName,
        },
        invoice: {
          id: invoiceId,
          invoiceNumber,
          amount: plan.price,
          currency: invoiceCurrency,
          status: 'pending',
          dueDate,
        }
      };
    });

    const tenantDb = getTenantDb(result.school.databaseUrl);
    await tenantDb.transaction(async (tx) => {
      for (const role of result.tenantSeed.roles) {
        await tx
          .insert(rolesTable)
          .values({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
          })
          .onConflictDoUpdate({
            target: rolesTable.id,
            set: {
              name: role.name,
              description: role.description,
              isSystem: role.isSystem,
              updatedAt: new Date(),
            },
          });
      }

      await tx
        .insert(departmentsTable)
        .values({
          id: result.tenantSeed.adminDeptId,
          name: 'Administration',
        })
        .onConflictDoNothing();

      await tx
        .insert(tenantUsersTable)
        .values({
          id: result.tenantSeed.adminUserId,
          email: result.tenantSeed.adminEmail,
          name: result.tenantSeed.adminName,
          roleId: result.tenantSeed.ownerRoleId,
          departmentId: result.tenantSeed.adminDeptId,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: tenantUsersTable.id,
          set: {
            email: result.tenantSeed.adminEmail,
            name: result.tenantSeed.adminName,
            roleId: result.tenantSeed.ownerRoleId,
            departmentId: result.tenantSeed.adminDeptId,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    });

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'School Provisioned',
      resource: 'schools',
      resourceId: result.school.id,
      changes: {
        schoolName: result.school.name,
        slug: result.school.slug,
        type: result.school.type,
        planName: result.planName,
        adminEmail: result.adminUser.email,
        invoiceNumber: result.invoice.invoiceNumber,
        moduleCount: modules.filter((module) => module.enabled).length,
        database: result.database,
      },
    });

    const delivery = await deliverProvisioningHandoff({
      school: {
        id: result.school.id,
        name: result.school.name,
        slug: result.school.slug,
        country: result.school.country,
        currencyCode: result.school.currencyCode,
      },
      adminUser: {
        name: result.adminUser.name,
        email: result.adminUser.email,
        phone: adminUser.phone,
      },
      planName: result.planName,
      temporaryPassword: result.temporaryPassword,
      portalUrl: result.portalUrl,
      tenantLoginUrl: result.tenantLoginUrl,
      invoice: result.invoice,
      database: result.database,
      settings,
    });

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'School Provisioning Handoff Delivered',
      resource: 'schools',
      resourceId: result.school.id,
      changes: {
        delivery,
      },
      status: delivery.ok ? 'success' : 'warning',
    });

    return NextResponse.json({
      success: true,
      ...result,
      delivery,
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
