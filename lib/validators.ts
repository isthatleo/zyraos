import { z } from "zod";

// ==================== AUTHENTICATION ====================
export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  portal: z.enum(["student", "parent", "teacher", "admin", "librarian", "accountant", "hr", "super_admin"]),
});

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  schoolId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ==================== SCHOOL MANAGEMENT ====================
export const schoolProfileSchema = z.object({
  name: z.string().min(2, "School name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  schoolType: z.enum(["primary", "secondary", "university", "vocational"]),
  motto: z.string().optional(),
  website: z.string().url().optional(),
});

// ==================== STUDENT MANAGEMENT ====================
export const studentEnrollmentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  otherNames: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  nationality: z.string().optional(),
  homeAddress: z.string().optional(),
  classId: z.string().min(1, "Class selection is required"),
  academicYearId: z.string().min(1, "Academic year selection is required"),
  previousSchool: z.string().optional(),
  enrollmentStatus: z.enum(["pending", "approved", "enrolled", "suspended"]).default("pending"),
});

export const parentGuardianSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phone: z.string().min(1, "Phone is required"),
  relationship: z.enum(["father", "mother", "guardian", "uncle", "aunt", "other"]),
  occupation: z.string().optional(),
  address: z.string().optional(),
  isPrimaryContact: z.boolean().default(false),
});

export const studentDocumentsSchema = z.object({
  birthCertificate: z.string().optional(),
  passport: z.string().optional(),
  previousSchoolResults: z.string().optional(),
  medicalRecords: z.string().optional(),
  otherDocuments: z.array(z.string()).optional(),
});

// ==================== ACADEMICS ====================
export const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  classCode: z.string().min(1, "Class code is required").unique(),
  academicYearId: z.string().min(1, "Academic year is required"),
  stage: z.string().min(1, "Stage is required"),
  capacity: z.number().int().positive().optional(),
  classTeacherId: z.string().optional(),
  description: z.string().optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  description: z.string().optional(),
  category: z.enum(["core", "elective", "extra_curricular", "extra"]),
  creditHours: z.number().int().positive().optional(),
  isMandatory: z.boolean().default(false),
});

export const timetableSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  slots: z.array(z.object({
    dayOfWeek: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    subjectId: z.string().min(1),
    teacherId: z.string().min(1),
    room: z.string().optional(),
  })),
});

// ==================== ATTENDANCE ====================
export const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classId: z.string().min(1, "Class is required"),
  date: z.string().datetime(),
  status: z.enum(["present", "absent", "late", "excused", "on-leave"]),
  remarks: z.string().optional(),
});

export const biometricSchema = z.object({
  studentId: z.string().min(1),
  biometricId: z.string().min(1, "Biometric ID is required"),
  biometricType: z.enum(["fingerprint", "facial", "iris", "rfid_card"]),
  enrollmentDate: z.string().datetime(),
});

// ==================== EXAMS & GRADING ====================
export const examSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  examCode: z.string().min(1, "Exam code is required"),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  academicYearId: z.string().min(1),
  classIds: z.array(z.string()).min(1, "At least one class is required"),
});

export const assessmentSchema = z.object({
  name: z.string().min(1, "Assessment name is required"),
  type: z.enum(["assignment", "quiz", "midterm", "project", "participation"]),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  totalMarks: z.number().int().positive(),
  weightage: z.number().min(0).max(100),
  dueDate: z.string().datetime(),
  description: z.string().optional(),
});

export const gradeSchema = z.object({
  studentId: z.string().min(1),
  assessmentId: z.string().min(1),
  marksObtained: z.number().min(0),
  feedback: z.string().optional(),
  submissionDate: z.string().datetime().optional(),
});

export const gradeScaleSchema = z.object({
  name: z.string().min(1),
  scales: z.array(z.object({
    minMark: z.number().min(0),
    maxMark: z.number().positive(),
    grade: z.string().min(1),
    remarks: z.string().optional(),
    gpa: z.number().min(0).max(4).optional(),
  })),
});

// ==================== FINANCE ====================
export const feeItemSchema = z.object({
  name: z.string().min(1, "Fee name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().default("GHS"),
  category: z.enum(["tuition", "academic", "residential", "transportation", "other"]),
  billingCycle: z.enum(["per_term", "per_semester", "per_month", "one_time"]),
  applicableStages: z.array(z.string()).min(1, "At least one stage is required"),
  isOptional: z.boolean().default(false),
});

export const scholarshipSchema = z.object({
  studentId: z.string().min(1),
  scholarshipType: z.enum(["merit", "need_based", "sports", "arts", "special"]),
  amount: z.number().positive(),
  percentage: z.number().min(0).max(100).optional(),
  approvalDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  conditions: z.string().optional(),
});

export const invoiceSchema = z.object({
  studentId: z.string().min(1),
  feeItems: z.array(z.object({
    feeItemId: z.string().min(1),
    amount: z.number().positive(),
    quantity: z.number().int().positive().default(1),
  })).min(1),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
});

// ==================== STAFF & PAYROLL ====================
export const staffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  staffId: z.string().min(1).unique(),
  designation: z.string().min(1),
  department: z.string().min(1),
  hireDate: z.string().datetime(),
  employmentType: z.enum(["permanent", "contract", "part_time", "temporary"]),
  baseSalary: z.number().positive(),
  currency: z.string().default("GHS"),
  bankAccount: z.string().optional(),
  address: z.string().optional(),
});

export const payrollSchema = z.object({
  staffId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().positive(),
  baseSalary: z.number().positive(),
  allowances: z.record(z.number()).optional(),
  deductions: z.record(z.number()).optional(),
  netSalary: z.number(),
  paymentDate: z.string().datetime(),
  paymentStatus: z.enum(["pending", "processed", "paid"]),
});

export const leaveSchema = z.object({
  staffId: z.string().min(1),
  leaveType: z.enum(["annual", "sick", "maternity", "compassionate", "unpaid", "other"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
  approverNotes: z.string().optional(),
});

// ==================== COMMUNICATION ====================
export const messageSchema = z.object({
  senderId: z.string().min(1),
  recipientId: z.string().min(1),
  subject: z.string().optional(),
  content: z.string().min(1, "Message cannot be empty"),
  attachments: z.array(z.string()).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  channel: z.enum(["sms", "email", "in_app", "all"]),
  targetAudience: z.enum(["all_students", "all_parents", "all_teachers", "all_staff", "specific_roles", "specific_users"]),
  targetRoles: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
  scheduledDate: z.string().datetime().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

// ==================== REPORTING ====================
export const reportFilterSchema = z.object({
  reportType: z.enum(["student_performance", "attendance", "finance", "staff", "class_analysis"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  format: z.enum(["pdf", "excel", "csv"]).optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type StudentEnrollmentInput = z.infer<typeof studentEnrollmentSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;

