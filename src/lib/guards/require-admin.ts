// Require admin guard
import { PermissionManager } from '../auth/permissions';

export async function requireAdmin(userId: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Check if user has admin permission
    const hasAdminPermission = await PermissionManager.hasPermission(userId, 'admin.access');
    if (!hasAdminPermission) {
      return { allowed: false, error: 'Admin access required' };
    }

    // Check if user has admin or super_admin role
    const userRoles = await PermissionManager.getUserRoles(userId);
    const hasAdminRole = userRoles.some(role => ['admin', 'super_admin'].includes(role));

    if (!hasAdminRole) {
      return { allowed: false, error: 'Admin role required' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return { allowed: false, error: 'Access check failed' };
  }
}

export async function requireSuperAdmin(userId: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Check if user has super_admin role
    const userRoles = await PermissionManager.getUserRoles(userId);
    const isSuperAdmin = userRoles.includes('super_admin');

    if (!isSuperAdmin) {
      return { allowed: false, error: 'Super admin access required' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking super admin access:', error);
    return { allowed: false, error: 'Access check failed' };
  }
}

export async function requirePermission(userId: string, permission: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const hasPermission = await PermissionManager.hasPermission(userId, permission);
    if (!hasPermission) {
      return { allowed: false, error: `Permission '${permission}' required` };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking permission:', error);
    return { allowed: false, error: 'Permission check failed' };
  }
}

export async function requireRole(userId: string, role: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const userRoles = await PermissionManager.getUserRoles(userId);
    const hasRole = userRoles.includes(role);

    if (!hasRole) {
      return { allowed: false, error: `Role '${role}' required` };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking role:', error);
    return { allowed: false, error: 'Role check failed' };
  }
}
