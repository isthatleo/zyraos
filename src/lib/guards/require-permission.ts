// Require permission guard
import { PermissionManager } from '../auth/permissions';

export async function requirePermission(userId: string, requiredPermission: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const hasPermission = await PermissionManager.hasPermission(userId, requiredPermission);
    if (!hasPermission) {
      return { allowed: false, error: `Permission '${requiredPermission}' required` };
    }
    return { allowed: true };
  } catch (error) {
    console.error('Error checking permission:', error);
    return { allowed: false, error: 'Permission check failed' };
  }
}

export async function requireAnyPermission(userId: string, permissions: string[]): Promise<{ allowed: boolean; error?: string }> {
  try {
    for (const permission of permissions) {
      const hasPermission = await PermissionManager.hasPermission(userId, permission);
      if (hasPermission) {
        return { allowed: true };
      }
    }
    return { allowed: false, error: `One of the following permissions required: ${permissions.join(', ')}` };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { allowed: false, error: 'Permission check failed' };
  }
}

export async function requireAllPermissions(userId: string, permissions: string[]): Promise<{ allowed: boolean; error?: string }> {
  try {
    for (const permission of permissions) {
      const hasPermission = await PermissionManager.hasPermission(userId, permission);
      if (!hasPermission) {
        return { allowed: false, error: `Permission '${permission}' required` };
      }
    }
    return { allowed: true };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { allowed: false, error: 'Permission check failed' };
  }
}

export async function checkResourceAccess(
  userId: string,
  resource: string,
  action: string,
  resourceOwnerId?: string
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const permission = `${resource}.${action}`;

    // Check if user has the required permission
    const hasPermission = await PermissionManager.hasPermission(userId, permission);
    if (!hasPermission) {
      return { allowed: false, error: `Permission '${permission}' required` };
    }

    // Additional ownership check for certain resources
    if (resourceOwnerId && ['users', 'students', 'parents'].includes(resource)) {
      // Allow access if user owns the resource or has admin permissions
      if (resourceOwnerId === userId) {
        return { allowed: true };
      }

      // Check if user has admin access to override ownership
      const hasAdminAccess = await PermissionManager.hasPermission(userId, 'admin.access');
      if (!hasAdminAccess) {
        return { allowed: false, error: 'Access denied: not resource owner and no admin privileges' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking resource access:', error);
    return { allowed: false, error: 'Access check failed' };
  }
}
