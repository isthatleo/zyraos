// Permissions utilities
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole?: boolean;
}

export class PermissionManager {
  private static permissions: Map<string, Permission> = new Map();
  private static roles: Map<string, Role> = new Map();

  static initialize() {
    // Initialize default permissions
    this.addPermission({
      id: 'users.read',
      name: 'Read Users',
      description: 'Can view user information',
      resource: 'users',
      action: 'read',
    });

    this.addPermission({
      id: 'users.write',
      name: 'Write Users',
      description: 'Can create and modify users',
      resource: 'users',
      action: 'write',
    });

    this.addPermission({
      id: 'schools.read',
      name: 'Read Schools',
      description: 'Can view school information',
      resource: 'schools',
      action: 'read',
    });

    this.addPermission({
      id: 'schools.write',
      name: 'Write Schools',
      description: 'Can create and modify schools',
      resource: 'schools',
      action: 'write',
    });

    this.addPermission({
      id: 'admin.access',
      name: 'Admin Access',
      description: 'Can access admin panel',
      resource: 'admin',
      action: 'access',
    });

    // Initialize default roles
    this.addRole({
      id: 'student',
      name: 'Student',
      description: 'Basic student role',
      permissions: ['users.read'],
      isSystemRole: true,
    });

    this.addRole({
      id: 'teacher',
      name: 'Teacher',
      description: 'Teacher role with additional permissions',
      permissions: ['users.read', 'schools.read'],
      isSystemRole: true,
    });

    this.addRole({
      id: 'admin',
      name: 'Administrator',
      description: 'School administrator',
      permissions: ['users.read', 'users.write', 'schools.read', 'schools.write'],
      isSystemRole: true,
    });

    this.addRole({
      id: 'super_admin',
      name: 'Super Administrator',
      description: 'System super administrator',
      permissions: ['users.read', 'users.write', 'schools.read', 'schools.write', 'admin.access'],
      isSystemRole: true,
    });
  }

  static addPermission(permission: Permission): void {
    this.permissions.set(permission.id, permission);
  }

  static getPermission(id: string): Permission | undefined {
    return this.permissions.get(id);
  }

  static getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  static addRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  static getRole(id: string): Role | undefined {
    return this.roles.get(id);
  }

  static getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  static async hasPermission(userId: string, permissionId: string): Promise<boolean> {
    // In production, this would check user's roles and their permissions from database
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some(roleId => {
      const role = this.roles.get(roleId);
      return role?.permissions.includes(permissionId);
    });
  }

  static async getUserPermissions(userId: string): Promise<string[]> {
    // In production, this would query database
    const userRoles = await this.getUserRoles(userId);
    const permissions = new Set<string>();

    userRoles.forEach(roleId => {
      const role = this.roles.get(roleId);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    });

    return Array.from(permissions);
  }

  static async getUserRoles(userId: string): Promise<string[]> {
    // In production, this would query database for user's roles
    // For now, return default role
    return ['student'];
  }

  static async assignRole(userId: string, roleId: string): Promise<boolean> {
    // Implementation would update user roles in database
    console.log(`Assigning role ${roleId} to user ${userId}`);
    return true;
  }

  static async revokeRole(userId: string, roleId: string): Promise<boolean> {
    // Implementation would remove role from user in database
    console.log(`Revoking role ${roleId} from user ${userId}`);
    return true;
  }

  static validatePermissionFormat(permission: string): boolean {
    // Validate permission format (resource.action)
    const parts = permission.split('.');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  }
}

// Initialize permissions on module load
PermissionManager.initialize();
