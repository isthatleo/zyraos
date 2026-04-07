import { rolesTable, rolePermissionsTable, subscriptionPlansTable, platformAdminsTable } from '../lib/db-schema';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/db-schema";

// Load .env from project root
dotenv.config({ path: resolve(process.cwd(), '.env') });

const masterClient = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const masterDb = drizzle(masterClient, { schema: schema.masterSchema });

async function seedDatabase() {
  console.log('Seeding database with default data...');

  // Create default roles
  const defaultRoles = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
    },
    {
      id: 'school_owner',
      name: 'School Owner',
      description: 'School administration and management',
      isSystem: true,
    },
    {
      id: 'school_admin',
      name: 'School Admin',
      description: 'School administration',
      isSystem: true,
    },
    {
      id: 'teacher',
      name: 'Teacher',
      description: 'Teaching staff',
      isSystem: true,
    },
    {
      id: 'lecturer',
      name: 'Lecturer',
      description: 'University lecturer',
      isSystem: true,
    },
    {
      id: 'accountant',
      name: 'Accountant',
      description: 'Financial management',
      isSystem: true,
    },
    {
      id: 'hr',
      name: 'HR Manager',
      description: 'Human resources management',
      isSystem: true,
    },
    {
      id: 'staff',
      name: 'Staff',
      description: 'General staff member',
      isSystem: true,
    },
    {
      id: 'student',
      name: 'Student',
      description: 'Student access',
      isSystem: true,
    },
    {
      id: 'parent',
      name: 'Parent',
      description: 'Parent access',
      isSystem: true,
    },
  ];

  // Insert roles
  for (const role of defaultRoles) {
    await masterDb.insert(rolesTable).values(role).onConflictDoNothing();
  }

  console.log('Roles created');

  // Create default permissions for each role
  const rolePermissions = [
    // Super Admin - all permissions
    { roleId: 'super_admin', permission: '*', resource: '*' },

    // School Owner - most permissions
    { roleId: 'school_owner', permission: 'read', resource: '*' },
    { roleId: 'school_owner', permission: 'write', resource: 'schools' },
    { roleId: 'school_owner', permission: 'write', resource: 'users' },
    { roleId: 'school_owner', permission: 'write', resource: 'finance' },
    { roleId: 'school_owner', permission: 'write', resource: 'academics' },
    { roleId: 'school_owner', permission: 'write', resource: 'billing' },
    { roleId: 'school_owner', permission: 'write', resource: 'subscriptions' },
    { roleId: 'school_owner', permission: 'read', resource: 'analytics' },

    // School Admin - administrative permissions
    { roleId: 'school_admin', permission: 'read', resource: '*' },
    { roleId: 'school_admin', permission: 'write', resource: 'users' },
    { roleId: 'school_admin', permission: 'write', resource: 'academics' },
    { roleId: 'school_admin', permission: 'write', resource: 'attendance' },
    { roleId: 'school_admin', permission: 'write', resource: 'communication' },
    { roleId: 'school_admin', permission: 'write', resource: 'finance' },
    { roleId: 'school_admin', permission: 'write', resource: 'library' },
    { roleId: 'school_admin', permission: 'read', resource: 'reports' },
    { roleId: 'school_admin', permission: 'write', resource: 'settings' },

    // Teacher - teaching related permissions
    { roleId: 'teacher', permission: 'read', resource: 'students' },
    { roleId: 'teacher', permission: 'read', resource: 'classes' },
    { roleId: 'teacher', permission: 'read', resource: 'subjects' },
    { roleId: 'teacher', permission: 'write', resource: 'attendance' },
    { roleId: 'teacher', permission: 'write', resource: 'examinations' },
    { roleId: 'teacher', permission: 'write', resource: 'assignments' },
    { roleId: 'teacher', permission: 'read', resource: 'timetable' },
    { roleId: 'teacher', permission: 'read', resource: 'reports' },
    { roleId: 'teacher', permission: 'read', resource: 'announcements' },

    // Lecturer - similar to teacher but for higher education
    { roleId: 'lecturer', permission: 'read', resource: 'students' },
    { roleId: 'lecturer', permission: 'read', resource: 'classes' },
    { roleId: 'lecturer', permission: 'read', resource: 'subjects' },
    { roleId: 'lecturer', permission: 'write', resource: 'attendance' },
    { roleId: 'lecturer', permission: 'write', resource: 'examinations' },
    { roleId: 'lecturer', permission: 'write', resource: 'assignments' },
    { roleId: 'lecturer', permission: 'read', resource: 'timetable' },
    { roleId: 'lecturer', permission: 'read', resource: 'reports' },
    { roleId: 'lecturer', permission: 'read', resource: 'announcements' },

    // Accountant - finance permissions
    { roleId: 'accountant', permission: 'read', resource: 'finance' },
    { roleId: 'accountant', permission: 'write', resource: 'payments' },
    { roleId: 'accountant', permission: 'write', resource: 'invoices' },
    { roleId: 'accountant', permission: 'write', resource: 'fee_structures' },
    { roleId: 'accountant', permission: 'write', resource: 'fee_plans' },
    { roleId: 'accountant', permission: 'read', resource: 'reports' },
    { roleId: 'accountant', permission: 'read', resource: 'billing' },

    // HR - staff management permissions
    { roleId: 'hr', permission: 'read', resource: 'staff' },
    { roleId: 'hr', permission: 'write', resource: 'staff' },
    { roleId: 'hr', permission: 'write', resource: 'departments' },
    { roleId: 'hr', permission: 'write', resource: 'leave_requests' },
    { roleId: 'hr', permission: 'write', resource: 'payroll' },
    { roleId: 'hr', permission: 'read', resource: 'reports' },
    { roleId: 'hr', permission: 'read', resource: 'users' },

    // Staff - general staff permissions
    { roleId: 'staff', permission: 'read', resource: 'profile' },
    { roleId: 'staff', permission: 'read', resource: 'announcements' },
    { roleId: 'staff', permission: 'read', resource: 'timetable' },

    // Student - limited permissions
    { roleId: 'student', permission: 'read', resource: 'profile' },
    { roleId: 'student', permission: 'read', resource: 'timetable' },
    { roleId: 'student', permission: 'read', resource: 'results' },
    { roleId: 'student', permission: 'read', resource: 'announcements' },
    { roleId: 'student', permission: 'read', resource: 'assignments' },
    { roleId: 'student', permission: 'read', resource: 'attendance' },
    { roleId: 'student', permission: 'read', resource: 'fees' },

    // Parent - parent-specific permissions
    { roleId: 'parent', permission: 'read', resource: 'children' },
    { roleId: 'parent', permission: 'read', resource: 'attendance' },
    { roleId: 'parent', permission: 'read', resource: 'results' },
    { roleId: 'parent', permission: 'read', resource: 'announcements' },
    { roleId: 'parent', permission: 'read', resource: 'fees' },
    { roleId: 'parent', permission: 'read', resource: 'assignments' },
    { roleId: 'parent', permission: 'read', resource: 'timetable' },
    { roleId: 'parent', permission: 'read', resource: 'communication' },
  ];

  // Insert permissions
  for (const permission of rolePermissions) {
    await masterDb.insert(rolePermissionsTable).values({ id: randomUUID(), ...permission }).onConflictDoNothing();
  }

  console.log('Permissions created');

  // Create default subscription plans
  const subscriptionPlans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small preschools and home-based learning centers.',
      price: '149.0',
      features: ['Up to 25 students', 'Up to 5 staff', 'Basic reporting', 'Mobile access'],
      maxStudents: 25,
      maxStaff: 5,
      isActive: true,
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Ideal for small primary schools and learning centers.',
      price: '299.0',
      features: ['Up to 50 students', 'Up to 10 staff', 'Core modules', 'Email support'],
      maxStudents: 50,
      maxStaff: 10,
      isActive: true,
    },
    {
      id: 'standard',
      name: 'Standard',
      description: 'Best for growing mid-sized primary and secondary schools.',
      price: '599.0',
      features: ['Up to 200 students', 'Up to 25 staff', 'All core modules', 'SMS notifications', 'Priority support'],
      maxStudents: 200,
      maxStaff: 25,
      isActive: true,
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Comprehensive solution for larger educational institutions.',
      price: '799.0',
      features: ['Up to 500 students', 'Up to 50 staff', 'Advanced analytics', 'Custom report cards', 'Full academic suite'],
      maxStudents: 500,
      maxStaff: 50,
      isActive: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Designed for elite schools requiring maximum capacity and features.',
      price: '999.0',
      features: ['Up to 1000 students', 'Unlimited staff', 'Financial management', 'Payroll system', 'Dedicated account manager'],
      maxStudents: 1000,
      maxStaff: null,
      isActive: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Tailored for multi-campus institutions and universities.',
      price: '1999.0',
      features: ['Unlimited students', 'Unlimited staff', 'Multi-campus management', 'API access', 'Custom integrations'],
      maxStudents: null,
      maxStaff: null,
      isActive: true,
    },
  ];

  // Insert subscription plans
  for (const plan of subscriptionPlans) {
    await masterDb.insert(subscriptionPlansTable).values(plan).onConflictDoNothing();
  }

  console.log('Subscription plans created');

  // Create default platform admin
  const platformAdmins = [
    {
      id: 'super-admin-1',
      email: 'leonardlomude@icloud.com',
      name: 'Super Admin',
      role: 'super_admin',
    },
  ];

  // Insert platform admins
  for (const admin of platformAdmins) {
    await masterDb.insert(platformAdminsTable).values(admin).onConflictDoNothing();
  }

  console.log('Platform admins created');
  console.log('Database seeding completed!');

  // Create default school types
  const schoolTypes = [
    {
      id: 'primary',
      name: 'Primary School',
      description: 'Elementary education for children aged 5-11',
      levels: ['Nursery', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
      typicalRoles: ['principal', 'teacher', 'counselor', 'librarian', 'admin_assistant'],
    },
    {
      id: 'secondary',
      name: 'Secondary School / High School',
      description: 'Secondary education for teenagers aged 11-18',
      levels: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
      typicalRoles: ['principal', 'vice_principal', 'teacher', 'subject_head', 'counselor', 'librarian', 'sports_coach'],
    },
    {
      id: 'college',
      name: 'College',
      description: 'Post-secondary education for young adults',
      levels: ['Year 1', 'Year 2', 'Year 3'],
      typicalRoles: ['dean', 'professor', 'lecturer', 'department_head', 'counselor', 'librarian'],
    },
    {
      id: 'university',
      name: 'University',
      description: 'Higher education institution',
      levels: ['Undergraduate', 'Graduate', 'Postgraduate'],
      typicalRoles: ['president', 'dean', 'professor', 'associate_professor', 'lecturer', 'research_assistant', 'department_head'],
    },
    {
      id: 'vocational',
      name: 'Vocational / Technical School',
      description: 'Technical and vocational education and training',
      levels: ['Level 1', 'Level 2', 'Level 3', 'Apprenticeship'],
      typicalRoles: ['director', 'instructor', 'workshop_supervisor', 'counselor', 'placement_officer'],
    },
  ];

  // Note: Assuming school_types table exists in schema, add seed data
  // If not, this would need to be added to db-schema.ts first
  // For now, we'll skip inserting as the table may not exist

  console.log('School types defined (add to schema if needed)');

  // Add additional roles specific to education levels
  const additionalRoles = [
    {
      id: 'principal',
      name: 'Principal',
      description: 'School principal / headmaster',
      isSystem: true,
    },
    {
      id: 'vice_principal',
      name: 'Vice Principal',
      description: 'Deputy principal',
      isSystem: true,
    },
    {
      id: 'dean',
      name: 'Dean',
      description: 'Academic dean',
      isSystem: true,
    },
    {
      id: 'professor',
      name: 'Professor',
      description: 'University professor',
      isSystem: true,
    },
    {
      id: 'associate_professor',
      name: 'Associate Professor',
      description: 'Associate professor',
      isSystem: true,
    },
    {
      id: 'subject_head',
      name: 'Subject Head',
      description: 'Head of subject department',
      isSystem: true,
    },
    {
      id: 'counselor',
      name: 'Counselor',
      description: 'Student counselor',
      isSystem: true,
    },
    {
      id: 'sports_coach',
      name: 'Sports Coach',
      description: 'Sports and physical education coach',
      isSystem: true,
    },
    {
      id: 'admin_assistant',
      name: 'Administrative Assistant',
      description: 'Administrative support staff',
      isSystem: true,
    },
    {
      id: 'department_head',
      name: 'Department Head',
      description: 'Head of academic department',
      isSystem: true,
    },
    {
      id: 'research_assistant',
      name: 'Research Assistant',
      description: 'Research support staff',
      isSystem: true,
    },
    {
      id: 'president',
      name: 'University President',
      description: 'University president / chancellor',
      isSystem: true,
    },
    {
      id: 'director',
      name: 'Director',
      description: 'Vocational school director',
      isSystem: true,
    },
    {
      id: 'instructor',
      name: 'Instructor',
      description: 'Technical instructor',
      isSystem: true,
    },
    {
      id: 'workshop_supervisor',
      name: 'Workshop Supervisor',
      description: 'Workshop and lab supervisor',
      isSystem: true,
    },
    {
      id: 'librarian',
      name: 'Librarian',
      description: 'School librarian',
      isSystem: true,
    },
    {
      id: 'placement_officer',
      name: 'Placement Officer',
      description: 'Career placement officer',
      isSystem: true,
    },
  ];

  // Insert additional roles
  for (const role of additionalRoles) {
    await masterDb.insert(rolesTable).values(role).onConflictDoNothing();
  }

  console.log('Additional roles created');

  // Add permissions for new roles
  const additionalRolePermissions = [
    // Principal - school leadership permissions
    { roleId: 'principal', permission: 'read', resource: '*' },
    { roleId: 'principal', permission: 'write', resource: 'users' },
    { roleId: 'principal', permission: 'write', resource: 'academics' },
    { roleId: 'principal', permission: 'write', resource: 'attendance' },
    { roleId: 'principal', permission: 'write', resource: 'communication' },
    { roleId: 'principal', permission: 'read', resource: 'reports' },
    { roleId: 'principal', permission: 'write', resource: 'settings' },

    // Vice Principal - deputy leadership
    { roleId: 'vice_principal', permission: 'read', resource: '*' },
    { roleId: 'vice_principal', permission: 'write', resource: 'users' },
    { roleId: 'vice_principal', permission: 'write', resource: 'academics' },
    { roleId: 'vice_principal', permission: 'write', resource: 'attendance' },
    { roleId: 'vice_principal', permission: 'read', resource: 'reports' },

    // Dean - academic leadership
    { roleId: 'dean', permission: 'read', resource: '*' },
    { roleId: 'dean', permission: 'write', resource: 'academics' },
    { roleId: 'dean', permission: 'write', resource: 'users' },
    { roleId: 'dean', permission: 'read', resource: 'reports' },
    { roleId: 'dean', permission: 'write', resource: 'communication' },

    // Professor - university teaching
    { roleId: 'professor', permission: 'read', resource: 'students' },
    { roleId: 'professor', permission: 'read', resource: 'classes' },
    { roleId: 'professor', permission: 'read', resource: 'subjects' },
    { roleId: 'professor', permission: 'write', resource: 'attendance' },
    { roleId: 'professor', permission: 'write', resource: 'examinations' },
    { roleId: 'professor', permission: 'write', resource: 'assignments' },
    { roleId: 'professor', permission: 'read', resource: 'timetable' },
    { roleId: 'professor', permission: 'read', resource: 'reports' },
    { roleId: 'professor', permission: 'read', resource: 'announcements' },

    // Associate Professor - similar to professor
    { roleId: 'associate_professor', permission: 'read', resource: 'students' },
    { roleId: 'associate_professor', permission: 'read', resource: 'classes' },
    { roleId: 'associate_professor', permission: 'read', resource: 'subjects' },
    { roleId: 'associate_professor', permission: 'write', resource: 'attendance' },
    { roleId: 'associate_professor', permission: 'write', resource: 'examinations' },
    { roleId: 'associate_professor', permission: 'write', resource: 'assignments' },
    { roleId: 'associate_professor', permission: 'read', resource: 'timetable' },
    { roleId: 'associate_professor', permission: 'read', resource: 'reports' },
    { roleId: 'associate_professor', permission: 'read', resource: 'announcements' },

    // Subject Head - department coordination
    { roleId: 'subject_head', permission: 'read', resource: 'students' },
    { roleId: 'subject_head', permission: 'read', resource: 'classes' },
    { roleId: 'subject_head', permission: 'read', resource: 'subjects' },
    { roleId: 'subject_head', permission: 'write', resource: 'attendance' },
    { roleId: 'subject_head', permission: 'write', resource: 'examinations' },
    { roleId: 'subject_head', permission: 'read', resource: 'reports' },
    { roleId: 'subject_head', permission: 'read', resource: 'announcements' },

    // Counselor - student support
    { roleId: 'counselor', permission: 'read', resource: 'students' },
    { roleId: 'counselor', permission: 'read', resource: 'attendance' },
    { roleId: 'counselor', permission: 'read', resource: 'results' },
    { roleId: 'counselor', permission: 'read', resource: 'reports' },
    { roleId: 'counselor', permission: 'write', resource: 'communication' },

    // Sports Coach - physical education
    { roleId: 'sports_coach', permission: 'read', resource: 'students' },
    { roleId: 'sports_coach', permission: 'write', resource: 'attendance' },
    { roleId: 'sports_coach', permission: 'read', resource: 'timetable' },
    { roleId: 'sports_coach', permission: 'read', resource: 'announcements' },

    // Librarian - library management
    { roleId: 'librarian', permission: 'read', resource: 'students' },
    { roleId: 'librarian', permission: 'write', resource: 'library' },
    { roleId: 'librarian', permission: 'read', resource: 'reports' },

    // Administrative Assistant - support staff
    { roleId: 'admin_assistant', permission: 'read', resource: 'users' },
    { roleId: 'admin_assistant', permission: 'read', resource: 'communication' },
    { roleId: 'admin_assistant', permission: 'read', resource: 'reports' },

    // Department Head - department leadership
    { roleId: 'department_head', permission: 'read', resource: 'students' },
    { roleId: 'department_head', permission: 'read', resource: 'classes' },
    { roleId: 'department_head', permission: 'read', resource: 'subjects' },
    { roleId: 'department_head', permission: 'write', resource: 'academics' },
    { roleId: 'department_head', permission: 'read', resource: 'reports' },

    // Research Assistant - research support
    { roleId: 'research_assistant', permission: 'read', resource: 'students' },
    { roleId: 'research_assistant', permission: 'read', resource: 'subjects' },
    { roleId: 'research_assistant', permission: 'read', resource: 'reports' },

    // University President - top leadership
    { roleId: 'president', permission: 'read', resource: '*' },
    { roleId: 'president', permission: 'write', resource: 'users' },
    { roleId: 'president', permission: 'write', resource: 'academics' },
    { roleId: 'president', permission: 'write', resource: 'finance' },
    { roleId: 'president', permission: 'read', resource: 'analytics' },

    // Director (Vocational) - vocational leadership
    { roleId: 'director', permission: 'read', resource: '*' },
    { roleId: 'director', permission: 'write', resource: 'users' },
    { roleId: 'director', permission: 'write', resource: 'academics' },
    { roleId: 'director', permission: 'read', resource: 'reports' },

    // Instructor (Vocational) - technical teaching
    { roleId: 'instructor', permission: 'read', resource: 'students' },
    { roleId: 'instructor', permission: 'read', resource: 'classes' },
    { roleId: 'instructor', permission: 'read', resource: 'subjects' },
    { roleId: 'instructor', permission: 'write', resource: 'attendance' },
    { roleId: 'instructor', permission: 'write', resource: 'examinations' },
    { roleId: 'instructor', permission: 'write', resource: 'assignments' },
    { roleId: 'instructor', permission: 'read', resource: 'timetable' },

    // Workshop Supervisor - lab/workshop management
    { roleId: 'workshop_supervisor', permission: 'read', resource: 'students' },
    { roleId: 'workshop_supervisor', permission: 'write', resource: 'attendance' },
    { roleId: 'workshop_supervisor', permission: 'read', resource: 'timetable' },
    { roleId: 'workshop_supervisor', permission: 'read', resource: 'resources' },

    // Placement Officer - career services
    { roleId: 'placement_officer', permission: 'read', resource: 'students' },
    { roleId: 'placement_officer', permission: 'read', resource: 'results' },
    { roleId: 'placement_officer', permission: 'write', resource: 'communication' },
    { roleId: 'placement_officer', permission: 'read', resource: 'reports' },
  ];

  // Insert additional permissions
  for (const permission of additionalRolePermissions) {
    await masterDb.insert(rolePermissionsTable).values({ id: randomUUID(), ...permission }).onConflictDoNothing();
  }

  console.log('Additional permissions created');
}

// Run the seed function
seedDatabase().catch(console.error);
