// Require admin middleware
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';

export async function requireAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  const hasPermission = await AuthService.hasPermission(userId, 'admin.access');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const userRoles = await AuthService.getUserRoles(userId);
  if (!userRoles.includes('admin') && !userRoles.includes('super_admin')) {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
  }

  // Add admin context
  const response = NextResponse.next();
  response.headers.set('x-admin-access', 'true');

  return response;
}
