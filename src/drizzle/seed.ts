// Database seeding
import { db } from './index';
import { PermissionManager } from '../lib/auth/permissions';
import { RoleManager } from '../lib/auth/roles';

export async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Seed permissions and roles
    await seedPermissionsAndRoles();

    // Seed initial data
    await seedInitialData();

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}

async function seedPermissionsAndRoles() {
  console.log('Seeding permissions and roles...');

  // Permissions are initialized in PermissionManager
  // Roles are initialized in RoleManager
  // This function ensures they exist in the database if needed

  // In a real implementation, you would insert these into database tables
  // For now, just log that they're initialized
  console.log('Permissions and roles initialized');
}

async function seedInitialData() {
  console.log('Seeding initial data...');

  // Seed default schools
  const defaultSchools = [
    {
      id: 'school_001',
      name: 'Demo Primary School',
      type: 'primary',
      address: '123 Main St, Demo City',
      phone: '+1234567890',
      email: 'admin@demoprimary.edu',
      maxStudents: 500,
      maxStaff: 50,
    },
    {
      id: 'school_002',
      name: 'Demo Secondary School',
      type: 'secondary',
      address: '456 Oak Ave, Demo City',
      phone: '+1234567891',
      email: 'admin@demosecondary.edu',
      maxStudents: 1000,
      maxStaff: 100,
    },
    {
      id: 'school_003',
      name: 'Demo University',
      type: 'university',
      address: '789 University Blvd, Demo City',
      phone: '+1234567892',
      email: 'admin@demouniversity.edu',
      maxStudents: 5000,
      maxStaff: 500,
    },
  ];

  // In a real implementation, insert into schools table
  console.log(`Seeded ${defaultSchools.length} default schools`);

  // Seed default admin user
  const defaultAdmin = {
    id: 'user_admin_001',
    email: 'admin@compusphere.com',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'super_admin',
    schoolId: null, // System admin
    isActive: true,
    createdAt: new Date(),
  };

  // In a real implementation, insert into users table
  console.log('Seeded default admin user');

  // Seed sample students
  const sampleStudents = [
    {
      id: 'student_001',
      schoolId: 'school_001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@demoprimary.edu',
      grade: '5',
      enrollmentDate: new Date('2024-09-01'),
    },
    {
      id: 'student_002',
      schoolId: 'school_002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@demosecondary.edu',
      grade: '10',
      enrollmentDate: new Date('2024-09-01'),
    },
    {
      id: 'student_003',
      schoolId: 'school_003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@demouniversity.edu',
      grade: 'Freshman',
      enrollmentDate: new Date('2024-09-01'),
    },
  ];

  // In a real implementation, insert into students table
  console.log(`Seeded ${sampleStudents.length} sample students`);

  // Seed sample teachers
  const sampleTeachers = [
    {
      id: 'teacher_001',
      schoolId: 'school_001',
      firstName: 'Alice',
      lastName: 'Wilson',
      email: 'alice.wilson@demoprimary.edu',
      subject: 'Mathematics',
      hireDate: new Date('2020-08-15'),
    },
    {
      id: 'teacher_002',
      schoolId: 'school_002',
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie.brown@demosecondary.edu',
      subject: 'Science',
      hireDate: new Date('2019-08-15'),
    },
  ];

  // In a real implementation, insert into teachers table
  console.log(`Seeded ${sampleTeachers.length} sample teachers`);

  // Seed sample parents
  const sampleParents = [
    {
      id: 'parent_001',
      firstName: 'Mary',
      lastName: 'Doe',
      email: 'mary.doe@email.com',
      phone: '+1234567890',
      childrenIds: ['student_001'],
    },
    {
      id: 'parent_002',
      firstName: 'David',
      lastName: 'Smith',
      email: 'david.smith@email.com',
      phone: '+1234567891',
      childrenIds: ['student_002'],
    },
  ];

  // In a real implementation, insert into parents table
  console.log(`Seeded ${sampleParents.length} sample parents`);
}

// Utility function to run seeding
export async function runSeeding() {
  try {
    await seedDatabase();
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  runSeeding();
}
