// Database schema definitions
import { pgTable, text, timestamp, uuid, jsonb, boolean, date } from 'drizzle-orm/pg-core';

// Students table
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  schoolId: text('school_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  dateOfBirth: date('date_of_birth').notNull(),
  grade: text('grade').notNull(),
  enrollmentDate: timestamp('enrollment_date').notNull().defaultNow(),
  graduationDate: timestamp('graduation_date'),
  status: text('status').notNull().default('active'), // active, inactive, graduated, transferred
  address: jsonb('address'), // { street, city, state, zipCode, country }
  emergencyContact: jsonb('emergency_contact'), // { name, relationship, phone, email }
  medicalInfo: jsonb('medical_info'), // { allergies, medications, conditions, doctorName, doctorPhone }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('student'), // student, teacher, admin, super_admin
  schoolId: text('school_id'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Schools table
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // primary, secondary, university, vocational
  address: jsonb('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  maxStudents: text('max_students'),
  maxStaff: text('max_staff'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Teachers table
export const teachers = pgTable('teachers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  schoolId: text('school_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  subject: text('subject'),
  hireDate: timestamp('hire_date').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Parents table
export const parents = pgTable('parents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  occupation: text('occupation'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Parent-Student relationships
export const parentStudents = pgTable('parent_students', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').references(() => parents.id).notNull(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  relationship: text('relationship').notNull(), // mother, father, guardian, etc.
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Grades table
export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  subject: text('subject').notNull(),
  grade: text('grade').notNull(), // A, B, C, D, F or numeric
  semester: text('semester').notNull(), // Fall 2024, Spring 2024, etc.
  year: text('year').notNull(),
  teacherId: uuid('teacher_id').references(() => teachers.id),
  comments: text('comments'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Attendance table
export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  date: date('date').notNull(),
  status: text('status').notNull(), // present, absent, late, excused
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  notes: text('notes'),
  recordedBy: uuid('recorded_by').references(() => teachers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Classes/Schedule table
export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  teacherId: uuid('teacher_id').references(() => teachers.id).notNull(),
  grade: text('grade').notNull(),
  schedule: jsonb('schedule'), // { days: ['monday', 'wednesday'], startTime: '09:00', endTime: '10:00' }
  maxStudents: text('max_students'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Class enrollments
export const classEnrollments = pgTable('class_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').references(() => classes.id).notNull(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  enrollmentDate: timestamp('enrollment_date').notNull().defaultNow(),
  status: text('status').notNull().default('active'), // active, dropped, completed
  grade: text('grade'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Assignments table
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').references(() => classes.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date').notNull(),
  points: text('points'),
  type: text('type').notNull().default('homework'), // homework, quiz, project, exam
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Assignment submissions
export const assignmentSubmissions = pgTable('assignment_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').references(() => assignments.id).notNull(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  submittedAt: timestamp('submitted_at'),
  grade: text('grade'),
  feedback: text('feedback'),
  status: text('status').notNull().default('pending'), // pending, submitted, graded, late
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(), // email, sms, push
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  priority: text('priority').notNull().default('normal'), // low, normal, high, urgent
  data: jsonb('data'), // Additional data for the notification
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Settings table
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value'),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
