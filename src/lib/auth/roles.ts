// Roles utilities
import { PermissionManager, Role } from './permissions';

export class RoleManager {
  // Role hierarchy management
  private static roleHierarchy: Map<string, string[]> = new Map();

  static initializeHierarchy() {
    // Define role inheritance (higher roles inherit lower role permissions)
    this.roleHierarchy.set('super_admin', ['admin', 'teacher', 'student']);
    this.roleHierarchy.set('admin', ['teacher', 'student']);
    this.roleHierarchy.set('teacher', ['student']);
    // student has no children
  }

  static getInheritedRoles(roleId: string): string[] {
    const inherited = new Set<string>();
    const addInherited = (r: string) => {
      inherited.add(r);
      const children = this.roleHierarchy.get(r) || [];
      children.forEach(child => addInherited(child));
    };

    addInherited(roleId);
    return Array.from(inherited);
  }

  static canAssignRole(assignerRole: string, targetRole: string): boolean {
    // Check if assigner can assign target role
    const assignerLevel = this.getRoleLevel(assignerRole);
    const targetLevel = this.getRoleLevel(targetRole);

    return assignerLevel > targetLevel; // Higher level can assign lower levels
  }

  private static getRoleLevel(roleId: string): number {
    const levels = {
      'student': 1,
      'teacher': 2,
      'admin': 3,
      'super_admin': 4,
    };
    return levels[roleId as keyof typeof levels] || 0;
  }

  // Role validation
  static validateRoleName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Role name cannot be empty' };
    }

    if (name.length > 50) {
      return { valid: false, error: 'Role name too long (max 50 characters)' };
    }

    if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
      return { valid: false, error: 'Role name contains invalid characters' };
    }

    return { valid: true };
  }

  static isSystemRole(roleId: string): boolean {
    const role = PermissionManager.getRole(roleId);
    return role?.isSystemRole || false;
  }

  // Bulk role operations
  static async assignRolesToUser(userId: string, roleIds: string[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const roleId of roleIds) {
      try {
        const success = await PermissionManager.assignRole(userId, roleId);
        if (!success) {
          errors.push(`Failed to assign role: ${roleId}`);
        }
      } catch (error) {
        errors.push(`Error assigning role ${roleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  static async revokeRolesFromUser(userId: string, roleIds: string[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const roleId of roleIds) {
      if (this.isSystemRole(roleId)) {
        errors.push(`Cannot revoke system role: ${roleId}`);
        continue;
      }

      try {
        const success = await PermissionManager.revokeRole(userId, roleId);
        if (!success) {
          errors.push(`Failed to revoke role: ${roleId}`);
        }
      } catch (error) {
        errors.push(`Error revoking role ${roleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  // Role analytics
  static async getRoleUsageStats(): Promise<Array<{ roleId: string; userCount: number; activeUsers: number }>> {
    // In production, this would query database
    const roles = PermissionManager.getAllRoles();
    return roles.map(role => ({
      roleId: role.id,
      userCount: Math.floor(Math.random() * 100), // Placeholder
      activeUsers: Math.floor(Math.random() * 50), // Placeholder
    }));
  }

  static async getUsersByRole(roleId: string): Promise<string[]> {
    // In production, this would query database for users with specific role
    return []; // Placeholder
  }

  // Role templates for common use cases
  static getRoleTemplate(template: string): Partial<Role> {
    const templates = {
      school_admin: {
        name: 'School Administrator',
        description: 'Manages school operations and staff',
        permissions: ['users.read', 'users.write', 'schools.read', 'schools.write'],
      },
      department_head: {
        name: 'Department Head',
        description: 'Leads a specific department',
        permissions: ['users.read', 'schools.read'],
      },
      parent: {
        name: 'Parent',
        description: 'Access to child information only',
        permissions: ['users.read'],
      },
    };

    return templates[template as keyof typeof templates] || {};
  }
}

// Initialize hierarchy on module load
RoleManager.initializeHierarchy();
