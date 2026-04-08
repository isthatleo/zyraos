/**
 * Permission Guards System
 * Granular permission checks for role-based access control
 */

import { redirect } from 'next/navigation';

export type UserRole =
  | 'developer'
  | 'super_admin'
  | 'admin'
  | 'staff'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'librarian'
  | 'accountant'
  | 'hr'
  | 'reception';

export interface AuthUser {
  id: string;
  role: UserRole;
  schoolId?: string;
  email: string;
  permissions?: string[];
}

/**
 * Require user to be authenticated
 */
export async function requireAuth(user: AuthUser | null): Promise<AuthUser> {
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}

/**
 * Require user to be a student
 */
export async function requireStudent(user: AuthUser | null): Promise<AuthUser> {
  await requireAuth(user);

  if (user!.role !== 'student') {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to be a teacher
 */
export async function requireTeacher(user: AuthUser | null): Promise<AuthUser> {
  await requireAuth(user);

  if (user!.role !== 'teacher' && user!.role !== 'admin') {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to be a parent/guardian
 */
export async function requireParent(user: AuthUser | null): Promise<AuthUser> {
  await requireAuth(user);

  if (user!.role !== 'parent') {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to be a school admin
 */
export async function requireAdmin(user: AuthUser | null): Promise<AuthUser> {
  await requireAuth(user);

  if (!['admin', 'super_admin', 'developer'].includes(user!.role)) {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to be a super admin
 */
export async function requireSuperAdmin(user: AuthUser | null): Promise<AuthUser> {
  await requireAuth(user);

  if (!['super_admin', 'developer'].includes(user!.role)) {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to be a developer (system owner)
 */
export async function requireDeveloper(user: AuthUser | null): Promise<AuthUser> {
  await requireAuth(user);

  if (user!.role !== 'developer') {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to have permission to manage school
 */
export async function requireSchoolAccess(user: AuthUser | null, schoolId: string): Promise<AuthUser> {
  const authUser = await requireAuth(user);

  // Developer and super admin have access to all schools
  if (['developer', 'super_admin'].includes(authUser.role)) {
    return authUser;
  }

  // Other roles must belong to the school
  if (authUser.schoolId !== schoolId) {
    redirect('/access-denied');
  }

  return authUser;
}

/**
 * Require user to have specific permission
 */
export async function requirePermission(user: AuthUser | null, permission: string): Promise<AuthUser> {
  const authUser = await requireAuth(user);

  // Developer has all permissions
  if (authUser.role === 'developer') {
    return authUser;
  }

  // Check if user has the permission
  if (!authUser.permissions?.includes(permission)) {
    redirect('/access-denied');
  }

  return authUser;
}

/**
 * Require user to have one of multiple roles
 */
export async function requireAnyRole(user: AuthUser | null, roles: UserRole[]): Promise<AuthUser> {
  await requireAuth(user);

  if (!roles.includes(user!.role)) {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Require user to NOT have a specific role
 */
export async function requireNotRole(user: AuthUser | null, roles: UserRole[]): Promise<AuthUser> {
  await requireAuth(user);

  if (roles.includes(user!.role)) {
    redirect('/access-denied');
  }

  return user!;
}

/**
 * Check if user has permission without redirecting
 */
export function canAccess(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;

  // Developer has all permissions
  if (user.role === 'developer') return true;

  return user.permissions?.includes(permission) ?? false;
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user has one of multiple roles
 */
export function hasAnyRole(user: AuthUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Role hierarchy and permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  developer: ['*'], // All permissions
  super_admin: [
    'manage_schools',
    'manage_users',
    'manage_billing',
    'manage_subscriptions',
    'view_analytics',
    'system_settings',
  ],
  admin: [
    'manage_staff',
    'manage_students',
    'manage_parents',
    'manage_classes',
    'manage_subjects',
    'manage_timetable',
    'view_reports',
    'manage_attendance',
    'manage_exams',
    'manage_finance',
    'manage_communications',
  ],
  staff: [
    'view_students',
    'view_classes',
    'manage_attendance',
    'view_timetable',
    'manage_communications',
  ],
  teacher: [
    'view_students',
    'view_classes',
    'manage_attendance',
    'manage_grades',
    'manage_assignments',
    'manage_communications',
    'view_reports',
  ],
  student: [
    'view_own_grades',
    'view_own_attendance',
    'view_own_schedule',
    'view_announcements',
    'submit_assignments',
  ],
  parent: [
    'view_child_grades',
    'view_child_attendance',
    'view_child_schedule',
    'view_announcements',
    'communicate_with_teachers',
    'view_child_payments',
  ],
  librarian: [
    'manage_library',
    'manage_books',
    'view_borrowing_history',
    'manage_resources',
  ],
  accountant: [
    'manage_payments',
    'manage_fees',
    'generate_invoices',
    'view_finance_reports',
    'manage_scholarships',
  ],
  hr: [
    'manage_staff_records',
    'manage_leave',
    'manage_payroll',
    'manage_recruitment',
    'view_staff_performance',
  ],
  reception: [
    'manage_visitors',
    'manage_appointments',
    'manage_inquiries',
    'view_announcements',
  ],
};

