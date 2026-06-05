import { NextRequest, NextResponse } from 'next/server';
import { getTenantDbBySlug, masterDb } from '@/lib/db';
import { userInvitationsTable, tenantUsersTable, rolesTable, schoolsTable } from '@/lib/db-schema';
import { eq, inArray } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { getTenantRoleDefinitionById, getTenantRoleDefinitions } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    const school = await masterDb
      .select({ id: schoolsTable.id, type: schoolsTable.type })
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, tenantSlug))
      .limit(1);

    if (!school.length) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug);
    const body = await request.json();
    const { email, name, roleId, departmentId } = body;

    if (!email || !name || !roleId) {
      return NextResponse.json(
        { error: 'Email, name, and roleId are required' },
        { status: 400 }
      );
    }

    const roleDefinitions = getTenantRoleDefinitions(school[0].type);
    const allowedRoles = new Set(roleDefinitions.map((role) => role.id));
    const resolvedRole = getTenantRoleDefinitionById(roleId, school[0].type);

    if (!resolvedRole || !allowedRoles.has(resolvedRole.id)) {
      return NextResponse.json(
        { error: 'Invalid role for this school portal' },
        { status: 400 }
      );
    }

    for (const role of roleDefinitions) {
      await tenantDb
        .insert(rolesTable)
        .values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem })
        .onConflictDoNothing();
    }

    // Get current user (inviter) from session
    // TODO: Implement proper session validation
    const inviterId = 'current-user-id'; // This should come from auth session

    // Check if role exists
    const role = await tenantDb
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, resolvedRole.id))
      .limit(1);

    if (!role.length) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    if (resolvedRole.canonicalRole === "owner") {
      const ownerRoleIds = roleDefinitions
        .filter((roleDefinition) => roleDefinition.canonicalRole === "owner")
        .map((roleDefinition) => roleDefinition.id);
      const owners = await tenantDb
        .select({ id: tenantUsersTable.id })
        .from(tenantUsersTable)
        .where(inArray(tenantUsersTable.roleId, ownerRoleIds));

      if (owners.length >= 2) {
        return NextResponse.json(
          { error: 'A school can have at most 2 owner accounts' },
          { status: 409 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await tenantDb
      .select()
      .from(tenantUsersTable)
      .where(eq(tenantUsersTable.email, email))
      .limit(1);

    if (existingUser.length) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if invitation already exists and is not used
    const existingInvitation = await tenantDb
      .select()
      .from(userInvitationsTable)
      .where(eq(userInvitationsTable.email, email))
      .limit(1);

    if (existingInvitation.length && !existingInvitation[0].isUsed) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      );
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create invitation
    const invitation = await tenantDb
      .insert(userInvitationsTable)
      .values({
        id: crypto.randomUUID(),
        email,
        name,
        roleId: resolvedRole.id,
        departmentId,
        invitedBy: inviterId,
        token,
        expiresAt,
      })
      .returning();

    // TODO: Send email with magic link
    const magicLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${tenantSlug}/auth/magic-link?token=${token}`;
    console.log('Magic link:', magicLink);

    return NextResponse.json({
      success: true,
      invitation: invitation[0],
      magicLink,
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
