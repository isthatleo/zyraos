-- ============================================================================
-- Comprehensive Database Seeding Script for ZyraOS
-- ============================================================================
-- This script:
-- 1. Deletes all users and related auth data
-- 2. Seeds all system roles and permissions
-- 3. Creates a super admin user
-- ============================================================================

-- Step 1: Delete all users and auth-related data (respecting foreign key constraints)
-- ============================================================================
BEGIN;

-- Clear sessions first (depends on users)
TRUNCATE TABLE "session" CASCADE;

-- Clear accounts (depends on users)
TRUNCATE TABLE "account" CASCADE;

-- Clear verifications
TRUNCATE TABLE "verification" CASCADE;

-- Clear the user table
TRUNCATE TABLE "user" CASCADE;

COMMIT;

-- ============================================================================
-- Step 2: Create System Roles
-- ============================================================================
BEGIN;

-- Store role IDs for use in permissions
DO $$
DECLARE
  super_admin_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  school_owner_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  school_admin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  teacher_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  student_id UUID := '550e8400-e29b-41d4-a716-446655440005';
  parent_id UUID := '550e8400-e29b-41d4-a716-446655440006';
  accounts_id UUID := '550e8400-e29b-41d4-a716-446655440007';
  hr_id UUID := '550e8400-e29b-41d4-a716-446655440008';
  staff_id UUID := '550e8400-e29b-41d4-a716-446655440009';
BEGIN

-- Insert roles
INSERT INTO "roles" (id, name, description, "is_system", created_at, updated_at)
VALUES
  (super_admin_id::text, 'Super Admin', 'Super Admin with full system access across all schools', true, NOW(), NOW()),
  (school_owner_id::text, 'School Owner', 'School owner with full access to their school', true, NOW(), NOW()),
  (school_admin_id::text, 'School Admin', 'School administrator with management access', true, NOW(), NOW()),
  (teacher_id::text, 'Teacher', 'Teacher with class and student management access', true, NOW(), NOW()),
  (student_id::text, 'Student', 'Student with limited access to their own data', true, NOW(), NOW()),
  (parent_id::text, 'Parent', 'Parent with access to their childrens data', true, NOW(), NOW()),
  (accounts_id::text, 'Accounts', 'Finance and accounting staff', true, NOW(), NOW()),
  (hr_id::text, 'HR', 'Human resources staff', true, NOW(), NOW()),
  (staff_id::text, 'Staff', 'General staff member', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 3: Seed Role Permissions
-- ============================================================================

-- Super Admin Permissions (Full access to everything)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'users', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'users', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'users', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'roles', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'roles', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'roles', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'roles', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'permissions', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'permissions', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'permissions', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'permissions', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'students', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'students', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'students', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'students', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'staff', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'staff', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'staff', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'staff', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'classes', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'classes', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'classes', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'classes', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'departments', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'departments', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'departments', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'departments', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'announcements', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'announcements', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'announcements', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'announcements', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'analytics', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'audit_logs', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'create', 'schools', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'schools', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'update', 'schools', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'delete', 'schools', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'invoices', NOW()),
  (gen_random_uuid()::text, super_admin_id::text, 'read', 'subscriptions', NOW())
ON CONFLICT DO NOTHING;

-- School Owner Permissions (Full access to their school)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, school_owner_id::text, 'create', 'users', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'update', 'users', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'delete', 'users', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'roles', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'create', 'students', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'students', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'update', 'students', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'delete', 'students', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'create', 'staff', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'staff', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'update', 'staff', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'delete', 'staff', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'create', 'classes', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'classes', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'update', 'classes', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'delete', 'classes', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'create', 'departments', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'departments', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'update', 'departments', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'delete', 'departments', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'create', 'announcements', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'announcements', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'update', 'announcements', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'delete', 'announcements', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'analytics', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'audit_logs', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'invoices', NOW()),
  (gen_random_uuid()::text, school_owner_id::text, 'read', 'subscriptions', NOW())
ON CONFLICT DO NOTHING;

-- School Admin Permissions (School management)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, school_admin_id::text, 'create', 'users', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'update', 'users', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'delete', 'users', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'roles', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'create', 'students', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'students', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'update', 'students', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'delete', 'students', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'create', 'staff', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'staff', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'update', 'staff', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'delete', 'staff', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'create', 'classes', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'classes', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'update', 'classes', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'delete', 'classes', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'departments', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'create', 'announcements', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'announcements', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'update', 'announcements', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'analytics', NOW()),
  (gen_random_uuid()::text, school_admin_id::text, 'read', 'audit_logs', NOW())
ON CONFLICT DO NOTHING;

-- Teacher Permissions (Class and student management)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, teacher_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, teacher_id::text, 'read', 'students', NOW()),
  (gen_random_uuid()::text, teacher_id::text, 'update', 'students', NOW()),
  (gen_random_uuid()::text, teacher_id::text, 'read', 'classes', NOW()),
  (gen_random_uuid()::text, teacher_id::text, 'create', 'announcements', NOW()),
  (gen_random_uuid()::text, teacher_id::text, 'read', 'announcements', NOW()),
  (gen_random_uuid()::text, teacher_id::text, 'update', 'announcements', NOW())
ON CONFLICT DO NOTHING;

-- Student Permissions (View own data)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, student_id::text, 'read', 'classes', NOW()),
  (gen_random_uuid()::text, student_id::text, 'read', 'announcements', NOW())
ON CONFLICT DO NOTHING;

-- Parent Permissions (Access to their children's data)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, parent_id::text, 'read', 'students', NOW()),
  (gen_random_uuid()::text, parent_id::text, 'read', 'classes', NOW()),
  (gen_random_uuid()::text, parent_id::text, 'read', 'announcements', NOW())
ON CONFLICT DO NOTHING;

-- Accounts Permissions (Finance and accounting)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, accounts_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'read', 'students', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'read', 'staff', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'create', 'invoices', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'read', 'invoices', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'update', 'invoices', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'read', 'subscriptions', NOW()),
  (gen_random_uuid()::text, accounts_id::text, 'read', 'analytics', NOW())
ON CONFLICT DO NOTHING;

-- HR Permissions (Human resources)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, hr_id::text, 'create', 'users', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'update', 'users', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'read', 'staff', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'update', 'staff', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'read', 'departments', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'create', 'departments', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'update', 'departments', NOW()),
  (gen_random_uuid()::text, hr_id::text, 'read', 'audit_logs', NOW())
ON CONFLICT DO NOTHING;

-- Staff Permissions (General staff member)
INSERT INTO "role_permissions" (id, role_id, permission, resource, created_at)
VALUES
  (gen_random_uuid()::text, staff_id::text, 'read', 'users', NOW()),
  (gen_random_uuid()::text, staff_id::text, 'read', 'departments', NOW()),
  (gen_random_uuid()::text, staff_id::text, 'create', 'announcements', NOW()),
  (gen_random_uuid()::text, staff_id::text, 'read', 'announcements', NOW())
ON CONFLICT DO NOTHING;

END;
$$;

COMMIT;

-- ============================================================================
-- Step 4: Create Super Admin User and Account
-- ============================================================================
BEGIN;

-- Create the super admin user
INSERT INTO "user" (id, email, "emailVerified", name, image, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@test.com',
  true,
  'Test Admin',
  NULL,
  'super_admin',
  NOW(),
  NOW()
);

-- Get the user ID we just created
DO $$
DECLARE
  user_id TEXT;
BEGIN
  SELECT id INTO user_id FROM "user" WHERE email = 'admin@test.com' LIMIT 1;

  -- Create account record with password (bcrypt hash for 'password123')
  -- Note: In production, use proper password hashing
  INSERT INTO "account" (id, "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'admin@test.com',
    'credential',
    user_id,
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'password123'
    NOW(),
    NOW()
  );
END;
$$;

COMMIT;

-- ============================================================================
-- Verification & Summary
-- ============================================================================

-- Display the created users
SELECT 'USERS CREATED:' AS section;
SELECT id, email, name, role FROM "user";

-- Display the created roles
SELECT '' AS section;
SELECT 'ROLES CREATED:' AS section;
SELECT id, name, description, is_system FROM "roles" ORDER BY name;

-- Display role permissions summary
SELECT '' AS section;
SELECT 'PERMISSIONS BY ROLE:' AS section;
SELECT
  r.name as role_name,
  COUNT(*) as total_permissions
FROM "role_permissions" rp
JOIN "roles" r ON rp.role_id = r.id
GROUP BY r.name
ORDER BY r.name;

-- ============================================================================
-- END OF SEED SCRIPT
-- ============================================================================
-- Summary:
-- ✓ All users deleted
-- ✓ 9 system roles created: Super Admin, School Owner, School Admin, Teacher, Student, Parent, Accounts, HR, Staff
-- ✓ Role-based permissions configured
-- ✓ Super Admin user created: admin@test.com (role: super_admin)
-- ✓ Password set to: password123
-- ============================================================================
