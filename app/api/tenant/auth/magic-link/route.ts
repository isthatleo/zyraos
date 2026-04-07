import { NextRequest, NextResponse } from 'next/server';
import { getTenantDbBySlug } from '@/lib/db';
import { userInvitationsTable, tenantUsersTable } from '@/lib/db-schema';
import { eq, and, gt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');
    const token = searchParams.get('token');

    if (!tenantSlug || !token) {
      return NextResponse.json(
        { error: 'Tenant slug and token are required' },
        { status: 400 }
      );
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug);

    // Find valid invitation
    const invitation = await tenantDb
      .select()
      .from(userInvitationsTable)
      .where(
        and(
          eq(userInvitationsTable.token, token),
          eq(userInvitationsTable.isUsed, false),
          gt(userInvitationsTable.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation.length) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    const invite = invitation[0];

    // Check if user already exists
    const existingUser = await tenantDb
      .select()
      .from(tenantUsersTable)
      .where(eq(tenantUsersTable.email, invite.email))
      .limit(1);

    let user;
    if (existingUser.length) {
      user = existingUser[0];
    } else {
      // Create new user
      const newUser = await tenantDb
        .insert(tenantUsersTable)
        .values({
          id: crypto.randomUUID(),
          email: invite.email,
          name: invite.name,
          roleId: invite.roleId,
          departmentId: invite.departmentId,
          emailVerified: true, // Magic link verifies email
        })
        .returning();

      user = newUser[0];
    }

    // Mark invitation as used
    await tenantDb
      .update(userInvitationsTable)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(eq(userInvitationsTable.id, invite.id));

    // TODO: Create auth session for the user
    // For now, redirect to login with success message
    const loginUrl = `/${tenantSlug}/login?message=Account activated successfully`;

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('Error processing magic link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
