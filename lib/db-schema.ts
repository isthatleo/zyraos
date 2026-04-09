import { pgTable, text, boolean, timestamp, index, uniqueIndex, foreignKey, integer, decimal, jsonb, uuid, serial } from "drizzle-orm/pg-core";

// Master Database Tables (Control Center)
export const platformAdminsTable = pgTable(
  "platform_admins",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: text("role").notNull().default("super_admin"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const schoolsTable = pgTable(
  "schools",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    country: text("country").notNull(),
    countryCode: text("country_code"),
    currencyCode: text("currency_code"),
    currencyName: text("currency_name"),
    type: text("type").notNull(), // primary, secondary, university
    databaseUrl: text("database_url").notNull(),
    status: text("status").notNull().default("active"),
    subscriptionId: text("subscription_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("schools_slug_idx").on(table.slug),
    index("schools_status_idx").on(table.status),
  ]
);

export const subscriptionPlansTable = pgTable(
  "subscription_plans",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    features: jsonb("features"),
    maxStudents: integer("max_students"),
    maxStaff: integer("max_staff"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id").notNull(),
    planId: text("plan_id").notNull(),
    status: text("status").notNull().default("active"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [schoolsTable.id],
      name: "subscriptions_school_id_schools_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [subscriptionPlansTable.id],
      name: "subscriptions_plan_id_subscription_plans_id_fk",
    }).onDelete("cascade"),
  ]
);

export const invoicesTable = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    schoolId: text("school_id").notNull(),
    subscriptionId: text("subscription_id"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("ZAR"),
    status: text("status").notNull().default("pending"), // pending, paid, overdue, void
    issueDate: timestamp("issue_date").notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidDate: timestamp("paid_date"),
    description: text("description"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [schoolsTable.id],
      name: "invoices_school_id_schools_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptionsTable.id],
      name: "invoices_subscription_id_subscriptions_id_fk",
    }).onDelete("set null"),
    index("invoices_school_id_idx").on(table.schoolId),
    index("invoices_status_idx").on(table.status),
  ]
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    changes: jsonb("changes"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    status: text("status").notNull().default("success"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_admin_id_idx").on(table.adminId),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_resource_idx").on(table.resource),
  ]
);

// Tenant Database Tables (Per School)
// These tables will be created in each school's isolated database

export const academicYearsTable = pgTable(
  "academic_years",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const termsTable = pgTable(
  "terms",
  {
    id: text("id").primaryKey(),
    academicYearId: text("academic_year_id").notNull(),
    name: text("name").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "terms_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
  ]
);

export const classesTable = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    section: text("section"),
    academicYearId: text("academic_year_id").notNull(),
    teacherId: text("teacher_id"),
    capacity: integer("capacity"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "classes_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
  ]
);

export const subjectsTable = pgTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    description: text("description"),
    type: text("type").notNull(), // core, elective, etc.
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const departmentsTable = pgTable(
  "departments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    headId: text("head_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const rolesTable = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const rolePermissionsTable = pgTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id").notNull(),
    permission: text("permission").notNull(),
    resource: text("resource").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [rolesTable.id],
      name: "role_permissions_role_id_roles_id_fk",
    }).onDelete("cascade"),
  ]
);

// Users table for tenant databases (separate from master users)
export const tenantUsersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull(),
    image: text("image"),
    roleId: text("role_id").notNull(),
    departmentId: text("department_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [rolesTable.id],
      name: "users_role_id_roles_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departmentsTable.id],
      name: "users_department_id_departments_id_fk",
    }).onDelete("set null"),
  ]
);

export const studentsTable = pgTable(
  "students",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    admissionNumber: text("admission_number").notNull().unique(),
    avatar: text("avatar"),
    dateOfBirth: timestamp("date_of_birth"),
    gender: text("gender").notNull(),
    address: text("address"),
    phone: text("phone"),
    emergencyContact: text("emergency_contact"),
    classId: text("class_id"),
    enrollmentDate: timestamp("enrollment_date").notNull(),
    graduationDate: timestamp("graduation_date"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tenantUsersTable.id],
      name: "students_user_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "students_class_id_classes_id_fk",
    }).onDelete("set null"),
  ]
);

export const guardiansTable = pgTable(
  "guardians",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    name: text("name").notNull(),
    relation: text("relation").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "guardians_student_id_students_id_fk",
    }).onDelete("cascade"),
  ]
);

export const enrollmentsTable = pgTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    classId: text("class_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    termId: text("term_id"),
    status: text("status").notNull().default("active"),
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "enrollments_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "enrollments_class_id_classes_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "enrollments_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "enrollments_term_id_terms_id_fk",
    }).onDelete("set null"),
  ]
);

export const staffTable = pgTable(
  "staff",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    employeeId: text("employee_id").notNull().unique(),
    departmentId: text("department_id").notNull(),
    position: text("position").notNull(),
    hireDate: timestamp("hire_date").notNull(),
    salary: decimal("salary", { precision: 10, scale: 2 }),
    qualifications: text("qualifications"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tenantUsersTable.id],
      name: "staff_user_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departmentsTable.id],
      name: "staff_department_id_departments_id_fk",
    }).onDelete("restrict"),
  ]
);

export const announcementsTable = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    authorId: text("author_id").notNull(),
    targetRoles: jsonb("target_roles"), // array of role IDs
    isPublished: boolean("is_published").notNull().default(false),
    publishDate: timestamp("publish_date"),
    expiryDate: timestamp("expiry_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [tenantUsersTable.id],
      name: "announcements_author_id_users_id_fk",
    }).onDelete("cascade"),
  ]
);

// Messaging & Communication Tables
export const conversationsTable = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'direct', 'group'
    name: text("name"), // for group conversations
    createdBy: text("created_by").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [tenantUsersTable.id],
      name: "conversations_created_by_users_id_fk",
    }).onDelete("cascade"),
    index("conversations_type_idx").on(table.type),
  ]
);

export const conversationMembersTable = pgTable(
  "conversation_members",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"), // 'owner', 'member'
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    leftAt: timestamp("left_at"),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversationsTable.id],
      name: "conversation_members_conversation_id_conversations_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tenantUsersTable.id],
      name: "conversation_members_user_id_users_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("conversation_members_unique_idx").on(table.conversationId, table.userId),
  ]
);

export const messagesTable = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    senderId: text("sender_id").notNull(),
    content: text("content").notNull(),
    attachments: jsonb("attachments"), // array of file URLs
    isEdited: boolean("is_edited").notNull().default(false),
    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversationsTable.id],
      name: "messages_conversation_id_conversations_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [tenantUsersTable.id],
      name: "messages_sender_id_users_id_fk",
    }).onDelete("cascade"),
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_created_at_idx").on(table.createdAt),
  ]
);

export const messageReadStatusTable = pgTable(
  "message_read_status",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").notNull(),
    userId: text("user_id").notNull(),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [messagesTable.id],
      name: "message_read_status_message_id_messages_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tenantUsersTable.id],
      name: "message_read_status_user_id_users_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("message_read_status_unique_idx").on(table.messageId, table.userId),
  ]
);

// Broadcast & Announcements Tables
export const broadcastsTable = pgTable(
  "broadcasts",
  {
    id: text("id").primaryKey(),
    createdBy: text("created_by").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    channel: text("channel").notNull(), // 'sms', 'email', 'in-app'
    targetAudience: text("target_audience").notNull(), // 'all', 'students', 'teachers', 'parents', 'staff', 'class', 'department', 'custom'
    targetAudienceIds: jsonb("target_audience_ids"), // array of IDs for specific targets
    status: text("status").notNull().default("draft"), // 'draft', 'scheduled', 'sent', 'failed'
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    failedAt: timestamp("failed_at"),
    metadata: jsonb("metadata"), // additional data like character count, sms count
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [tenantUsersTable.id],
      name: "broadcasts_created_by_users_id_fk",
    }).onDelete("cascade"),
    index("broadcasts_status_idx").on(table.status),
    index("broadcasts_channel_idx").on(table.channel),
    index("broadcasts_created_at_idx").on(table.createdAt),
  ]
);

export const broadcastDeliveriesTable = pgTable(
  "broadcast_deliveries",
  {
    id: text("id").primaryKey(),
    broadcastId: text("broadcast_id").notNull(),
    userId: text("user_id").notNull(),
    phone: text("phone"),
    email: text("email"),
    status: text("status").notNull().default("pending"), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
    deliveryError: text("delivery_error"),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),
    externalReference: text("external_reference"), // provider's message ID
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.broadcastId],
      foreignColumns: [broadcastsTable.id],
      name: "broadcast_deliveries_broadcast_id_broadcasts_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tenantUsersTable.id],
      name: "broadcast_deliveries_user_id_users_id_fk",
    }).onDelete("cascade"),
    index("broadcast_deliveries_broadcast_id_idx").on(table.broadcastId),
    index("broadcast_deliveries_status_idx").on(table.status),
  ]
);

// Finance & Payment Tables
export const feesTable = pgTable(
  "fees",
  {
    id: text("id").primaryKey(),
    feeType: text("fee_type").notNull(), // 'tuition', 'activity', 'transport', 'uniform', 'lunch', 'other'
    name: text("name").notNull(),
    description: text("description"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    semester: text("semester").notNull(), // 'semester_1', 'semester_2', 'term_1', 'term_2', etc.
    academicYearId: text("academic_year_id").notNull(),
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "fees_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
    index("fees_fee_type_idx").on(table.feeType),
  ]
);

export const studentFeesTable = pgTable(
  "student_fees",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    feeId: text("fee_id").notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    outstandingBalance: decimal("outstanding_balance", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("unpaid"), // 'unpaid', 'partial', 'paid', 'overdue'
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "student_fees_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.feeId],
      foreignColumns: [feesTable.id],
      name: "student_fees_fee_id_fees_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("student_fees_unique_idx").on(table.studentId, table.feeId),
  ]
);

export const paymentsTable = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    studentFeeId: text("student_fee_id").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull(), // 'card', 'mobile_money', 'bank_transfer', 'cash'
    paymentReference: text("payment_reference").notNull().unique(),
    provider: text("provider"), // 'paystack', 'flutterwave', etc.
    status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded'
    providerResponse: jsonb("provider_response"),
    completedAt: timestamp("completed_at"),
    failedAt: timestamp("failed_at"),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "payments_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.studentFeeId],
      foreignColumns: [studentFeesTable.id],
      name: "payments_student_fee_id_student_fees_id_fk",
    }).onDelete("cascade"),
    index("payments_student_id_idx").on(table.studentId),
    index("payments_status_idx").on(table.status),
    index("payments_created_at_idx").on(table.createdAt),
  ]
);

export const paystackConfigTable = pgTable(
  "paystack_config",
  {
    id: text("id").primaryKey(),
    publicKey: text("public_key").notNull(),
    secretKey: text("secret_key").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    testMode: boolean("test_mode").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// SMS Provider Configuration
export const smsProvidersTable = pgTable(
  "sms_providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // 'twilio', 'infobip', 'africas_talking', etc.
    displayName: text("display_name").notNull(),
    apiKey: text("api_key").notNull(),
    apiSecret: text("api_secret"),
    accountSid: text("account_sid"), // for Twilio
    senderName: text("sender_name"),
    isActive: boolean("is_active").notNull().default(true),
    status: text("status").notNull().default("inactive"), // 'active', 'inactive', 'error'
    availableCredits: integer("available_credits").notNull().default(0),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// Email Provider Configuration
export const emailProvidersTable = pgTable(
  "email_providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // 'sendgrid', 'mailgun', etc.
    displayName: text("display_name").notNull(),
    apiKey: text("api_key").notNull(),
    senderEmail: text("sender_email").notNull(),
    senderName: text("sender_name"),
    isActive: boolean("is_active").notNull().default(true),
    status: text("status").notNull().default("inactive"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// Transaction/Ledger Table
export const transactionLedgerTable = pgTable(
  "transaction_ledger",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id"),
    studentId: text("student_id").notNull(),
    type: text("type").notNull(), // 'payment', 'refund', 'adjustment', 'fee_waiver'
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    reference: text("reference"),
    balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
      name: "transaction_ledger_payment_id_payments_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "transaction_ledger_student_id_students_id_fk",
    }).onDelete("cascade"),
    index("transaction_ledger_student_id_idx").on(table.studentId),
    index("transaction_ledger_created_at_idx").on(table.createdAt),
  ]
);

// Invoice Table
export const studentInvoicesTable = pgTable(
  "student_invoices",
  {
    id: text("id").primaryKey(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    studentId: text("student_id").notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    outstandingBalance: decimal("outstanding_balance", { precision: 12, scale: 2 }).notNull(),
    dueDate: timestamp("due_date"),
    issuedDate: timestamp("issued_date").notNull().defaultNow(),
    status: text("status").notNull().default("unpaid"), // 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "student_invoices_student_id_students_id_fk",
    }).onDelete("cascade"),
    index("student_invoices_student_id_idx").on(table.studentId),
    index("student_invoices_status_idx").on(table.status),
  ]
);

// Notification Settings Table
export const notificationSettingsTable = pgTable(
  "notification_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    smsNotifications: boolean("sms_notifications").notNull().default(true),
    inAppNotifications: boolean("in_app_notifications").notNull().default(true),
    broadcastNotifications: boolean("broadcast_notifications").notNull().default(true),
    paymentNotifications: boolean("payment_notifications").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tenantUsersTable.id],
      name: "notification_settings_user_id_users_id_fk",
    }).onDelete("cascade"),
  ]
);

// System Settings Table
export const systemSettingsTable = pgTable(
  "system_settings",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value"),
    category: text("category").notNull(), // 'email', 'sms', 'payment', 'general', 'academic'
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// Receipt Templates Table
export const receiptTemplatesTable = pgTable(
  "receipt_templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    templateData: jsonb("template_data").notNull(), // Canvas layout, elements, styling
    thumbnail: text("thumbnail"), // Base64 image or URL
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    category: text("category").notNull().default("general"), // 'payment', 'fee', 'tuition', 'general'
    tags: jsonb("tags"), // Array of tags for filtering
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("receipt_templates_category_idx").on(table.category),
    index("receipt_templates_is_default_idx").on(table.isDefault),
  ]
);

// Receipts Table
export const receiptsTable = pgTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    receiptNumber: text("receipt_number").notNull().unique(),
    templateId: text("template_id"),
    studentId: text("student_id").notNull(),
    paymentId: text("payment_id"),
    studentFeeId: text("student_fee_id"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("ZAR"),
    paymentMethod: text("payment_method"),
    paymentDate: timestamp("payment_date").notNull(),
    issuedDate: timestamp("issued_date").notNull().defaultNow(),
    issuedBy: text("issued_by").notNull(),
    status: text("status").notNull().default("issued"), // 'issued', 'sent', 'printed', 'voided'
    recipientEmail: text("recipient_email"),
    recipientPhone: text("recipient_phone"),
    sentAt: timestamp("sent_at"),
    printedAt: timestamp("printed_at"),
    voidedAt: timestamp("voided_at"),
    voidedReason: text("voided_reason"),
    pdfUrl: text("pdf_url"), // URL to generated PDF
    metadata: jsonb("metadata"), // Additional data for template rendering
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("receipts_student_id_idx").on(table.studentId),
    index("receipts_payment_id_idx").on(table.paymentId),
    index("receipts_status_idx").on(table.status),
    index("receipts_issued_date_idx").on(table.issuedDate),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [receiptTemplatesTable.id],
      name: "receipts_template_id_receipt_templates_id_fk",
    }),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "receipts_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
      name: "receipts_payment_id_payments_id_fk",
    }),
    foreignKey({
      columns: [table.studentFeeId],
      foreignColumns: [studentFeesTable.id],
      name: "receipts_student_fee_id_student_fees_id_fk",
    }),
  ]
);

// Gradebook and Assessment Tables
export const gradebookTable = pgTable(
  "gradebook",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    subjectId: text("subject_id").notNull(),
    classId: text("class_id").notNull(),
    termId: text("term_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    assessmentType: text("assessment_type").notNull(), // 'exam', 'test', 'assignment', 'project', 'participation'
    assessmentName: text("assessment_name").notNull(),
    score: decimal("score", { precision: 5, scale: 2 }), // Actual score
    maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(), // Maximum possible score
    percentage: decimal("percentage", { precision: 5, scale: 2 }), // Calculated percentage
    grade: text("grade"), // Letter grade (A, B, C, D, F)
    weight: decimal("weight", { precision: 3, scale: 2 }).notNull().default("1"), // Weight in final calculation
    assessmentDate: timestamp("assessment_date").notNull(),
    teacherId: text("teacher_id").notNull(),
    notes: text("notes"),
    isExcused: boolean("is_excused").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("gradebook_student_id_idx").on(table.studentId),
    index("gradebook_subject_id_idx").on(table.subjectId),
    index("gradebook_class_id_idx").on(table.classId),
    index("gradebook_term_id_idx").on(table.termId),
    index("gradebook_academic_year_id_idx").on(table.academicYearId),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "gradebook_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.subjectId],
      foreignColumns: [subjectsTable.id],
      name: "gradebook_subject_id_subjects_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "gradebook_class_id_classes_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "gradebook_term_id_terms_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "gradebook_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.teacherId],
      foreignColumns: [tenantUsersTable.id],
      name: "gradebook_teacher_id_users_id_fk",
    }).onDelete("restrict"),
  ]
);

// Assessments Table
export const assessmentsTable = pgTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    subjectId: text("subject_id").notNull(),
    classId: text("class_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    termId: text("term_id").notNull(),
    assessmentType: text("assessment_type").notNull(), // 'test', 'quiz', 'assignment', 'project', 'exam'
    totalScore: decimal("total_score", { precision: 5, scale: 2 }).notNull(),
    passingScore: decimal("passing_score", { precision: 5, scale: 2 }),
    dueDate: timestamp("due_date"),
    releaseDate: timestamp("release_date"),
    createdBy: text("created_by").notNull(),
    status: text("status").notNull().default("draft"), // 'draft', 'published', 'closed'
    instructions: text("instructions"),
    rubric: jsonb("rubric"), // Grading rubric
    attachments: jsonb("attachments"), // File attachments
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("assessments_subject_id_idx").on(table.subjectId),
    index("assessments_class_id_idx").on(table.classId),
    index("assessments_academic_year_id_idx").on(table.academicYearId),
    index("assessments_term_id_idx").on(table.termId),
    index("assessments_status_idx").on(table.status),
    foreignKey({
      columns: [table.subjectId],
      foreignColumns: [subjectsTable.id],
      name: "assessments_subject_id_subjects_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "assessments_class_id_classes_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "assessments_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "assessments_term_id_terms_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [tenantUsersTable.id],
      name: "assessments_created_by_users_id_fk",
    }).onDelete("restrict"),
  ]
);

// Exams Table
export const examsTable = pgTable(
  "exams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    assessmentId: text("assessment_id"),
    classId: text("class_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    termId: text("term_id").notNull(),
    examDate: timestamp("exam_date").notNull(),
    startTime: text("start_time"),
    endTime: text("end_time"),
    location: text("location"),
    invigilator: text("invigilator"),
    totalMarks: decimal("total_marks", { precision: 5, scale: 2 }).notNull(),
    passingMarks: decimal("passing_marks", { precision: 5, scale: 2 }),
    duration: integer("duration"), // Duration in minutes
    examType: text("exam_type").notNull(), // 'midterm', 'final', 'mock', 'practical'
    status: text("status").notNull().default("scheduled"), // 'scheduled', 'in-progress', 'completed', 'cancelled'
    instructions: text("instructions"),
    rules: jsonb("rules"), // Exam rules and regulations
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("exams_class_id_idx").on(table.classId),
    index("exams_academic_year_id_idx").on(table.academicYearId),
    index("exams_term_id_idx").on(table.termId),
    index("exams_exam_date_idx").on(table.examDate),
    index("exams_status_idx").on(table.status),
    foreignKey({
      columns: [table.assessmentId],
      foreignColumns: [assessmentsTable.id],
      name: "exams_assessment_id_assessments_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "exams_class_id_classes_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "exams_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "exams_term_id_terms_id_fk",
    }).onDelete("cascade"),
  ]
);

// Report Card Templates Table
export const reportCardTemplatesTable = pgTable(
  "report_card_templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    templateData: jsonb("template_data").notNull(), // Canvas layout, elements, styling
    thumbnail: text("thumbnail"), // Base64 image or URL
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    gradeLevel: text("grade_level"), // 'primary', 'secondary', 'all'
    createdBy: text("created_by").notNull(),
    category: text("category").notNull().default("general"), // 'termly', 'yearly', 'final'
    tags: jsonb("tags"), // Array of tags for filtering
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("report_card_templates_created_by_idx").on(table.createdBy),
    index("report_card_templates_category_idx").on(table.category),
    index("report_card_templates_grade_level_idx").on(table.gradeLevel),
    index("report_card_templates_is_default_idx").on(table.isDefault),
  ]
);

// Report Cards Table
export const reportCardsTable = pgTable(
  "report_cards",
  {
    id: text("id").primaryKey(),
    reportCardNumber: text("report_card_number").notNull().unique(),
    templateId: text("template_id"),
    studentId: text("student_id").notNull(),
    classId: text("class_id").notNull(),
    termId: text("term_id"),
    academicYearId: text("academic_year_id").notNull(),
    reportType: text("report_type").notNull(), // 'termly', 'yearly', 'final'
    overallGrade: text("overall_grade"), // Overall letter grade
    overallPercentage: decimal("overall_percentage", { precision: 5, scale: 2 }),
    gpa: decimal("gpa", { precision: 3, scale: 2 }), // Grade Point Average
    rank: integer("rank"), // Class rank
    totalStudents: integer("total_students"), // Total students in class
    attendanceDays: integer("attendance_days").notNull().default(0),
    totalDays: integer("total_days").notNull().default(0),
    attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
    teacherComments: text("teacher_comments"),
    principalComments: text("principal_comments"),
    parentComments: text("parent_comments"),
    issuedDate: timestamp("issued_date").notNull().defaultNow(),
    issuedBy: text("issued_by").notNull(),
    status: text("status").notNull().default("draft"), // 'draft', 'issued', 'sent', 'printed'
    recipientEmail: text("recipient_email"),
    recipientPhone: text("recipient_phone"),
    sentAt: timestamp("sent_at"),
    printedAt: timestamp("printed_at"),
    pdfUrl: text("pdf_url"), // URL to generated PDF
    metadata: jsonb("metadata"), // Additional data for template rendering
    gradesData: jsonb("grades_data"), // Calculated grades for template rendering
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("report_cards_student_id_idx").on(table.studentId),
    index("report_cards_class_id_idx").on(table.classId),
    index("report_cards_term_id_idx").on(table.termId),
    index("report_cards_academic_year_id_idx").on(table.academicYearId),
    index("report_cards_status_idx").on(table.status),
    index("report_cards_issued_date_idx").on(table.issuedDate),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [reportCardTemplatesTable.id],
      name: "report_cards_template_id_report_card_templates_id_fk",
    }),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "report_cards_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "report_cards_class_id_classes_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "report_cards_term_id_terms_id_fk",
    }),
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "report_cards_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
  ]
);

// Student Progress Tracking Table
export const studentProgressTable = pgTable(
  "student_progress",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    termId: text("term_id"),
    subjectId: text("subject_id"),
    progressType: text("progress_type").notNull(), // 'academic', 'behavioral', 'attendance', 'overall'
    progressDate: timestamp("progress_date").notNull(),
    progressValue: decimal("progress_value", { precision: 5, scale: 2 }), // Score/percentage/value
    progressNote: text("progress_note"),
    recordedBy: text("recorded_by").notNull(),
    isPositive: boolean("is_positive").notNull().default(true),
    category: text("category"), // 'improvement', 'concern', 'achievement', 'goal'
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("student_progress_student_id_idx").on(table.studentId),
    index("student_progress_academic_year_id_idx").on(table.academicYearId),
    index("student_progress_term_id_idx").on(table.termId),
    index("student_progress_subject_id_idx").on(table.subjectId),
    index("student_progress_progress_type_idx").on(table.progressType),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "student_progress_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "student_progress_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "student_progress_term_id_terms_id_fk",
    }),
    foreignKey({
      columns: [table.subjectId],
      foreignColumns: [subjectsTable.id],
      name: "student_progress_subject_id_subjects_id_fk",
    }),
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [tenantUsersTable.id],
      name: "student_progress_recorded_by_users_id_fk",
    }).onDelete("restrict"),
  ]
);

// Grading Scales Table
export const gradingScalesTable = pgTable(
  "grading_scales",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    scaleType: text("scale_type").notNull(), // 'letter', 'percentage', 'points'
    minScore: decimal("min_score", { precision: 5, scale: 2 }).notNull(),
    maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
    grade: text("grade").notNull(), // 'A', 'B', 'A-', etc.
    gradePoint: decimal("grade_point", { precision: 3, scale: 2 }), // GPA points
    description: text("description"),
    color: text("color"), // For UI display
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("grading_scales_scale_type_idx").on(table.scaleType),
    index("grading_scales_is_default_idx").on(table.isDefault),
  ]
);

// Attendance Table
export const attendanceTable = pgTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    classId: text("class_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    termId: text("term_id"),
    attendanceDate: timestamp("attendance_date").notNull(),
    status: text("status").notNull(), // 'present', 'absent', 'late', 'excused'
    remarks: text("remarks"),
    recordedBy: text("recorded_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("attendance_student_id_idx").on(table.studentId),
    index("attendance_class_id_idx").on(table.classId),
    index("attendance_date_idx").on(table.attendanceDate),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "attendance_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classesTable.id],
      name: "attendance_class_id_classes_id_fk",
    }).onDelete("cascade"),
  ]
);

// Fee Items Table
export const feeItemsTable = pgTable(
  "fee_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    feeType: text("fee_type").notNull(), // 'tuition', 'activity', 'transport', 'uniform', 'lunch', 'other'
    academicYearId: text("academic_year_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.academicYearId],
      foreignColumns: [academicYearsTable.id],
      name: "fee_items_academic_year_id_academic_years_id_fk",
    }).onDelete("cascade"),
  ]
);

// Grades Table (alias for gradebook entries)
export const gradesTable = pgTable(
  "grades",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    subjectId: text("subject_id").notNull(),
    classId: text("class_id").notNull(),
    academicYearId: text("academic_year_id").notNull(),
    termId: text("term_id"),
    assessmentType: text("assessment_type").notNull(), // 'exam', 'test', 'assignment', 'project', 'participation'
    score: decimal("score", { precision: 5, scale: 2 }).notNull(),
    maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
    percentage: decimal("percentage", { precision: 5, scale: 2 }),
    grade: text("grade"), // Letter grade
    weight: decimal("weight", { precision: 3, scale: 2 }).default("1"),
    assessmentDate: timestamp("assessment_date").notNull(),
    teacherId: text("teacher_id").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("grades_student_id_idx").on(table.studentId),
    index("grades_subject_id_idx").on(table.subjectId),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [studentsTable.id],
      name: "grades_student_id_students_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.subjectId],
      foreignColumns: [subjectsTable.id],
      name: "grades_subject_id_subjects_id_fk",
    }).onDelete("cascade"),
  ]
);

// Leave Table (for HR/Staff)
export const leaveTable = pgTable(
  "leave",
  {
    id: text("id").primaryKey(),
    staffId: text("staff_id").notNull(),
    leaveType: text("leave_type").notNull(), // 'annual', 'sick', 'maternity', 'compassionate', 'unpaid'
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    numberOfDays: decimal("number_of_days", { precision: 5, scale: 2 }).notNull(),
    reason: text("reason"),
    approvedBy: text("approved_by"),
    status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'cancelled'
    remarks: text("remarks"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffTable.id],
      name: "leave_staff_id_staff_id_fk",
    }).onDelete("cascade"),
  ]
);

// Payroll Table
export const payrollTable = pgTable(
  "payroll",
  {
    id: text("id").primaryKey(),
    staffId: text("staff_id").notNull(),
    payrollPeriod: text("payroll_period").notNull(), // 'monthly', 'bi-weekly', etc.
    payrollMonth: text("payroll_month").notNull(), // e.g., '2024-01'
    basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
    allowances: decimal("allowances", { precision: 12, scale: 2 }).default("0"),
    deductions: decimal("deductions", { precision: 12, scale: 2 }).default("0"),
    grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
    netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("pending"), // 'pending', 'approved', 'paid'
    paymentDate: timestamp("payment_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffTable.id],
      name: "payroll_staff_id_staff_id_fk",
    }).onDelete("cascade"),
    index("payroll_payroll_month_idx").on(table.payrollMonth),
  ]
);

// Keep existing tables for backward compatibility (these might be used in master DB or migrated)
export const userTable = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    name: text("name"),
    image: text("image"),
    role: text("role").default("user"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("user_role_idx").on(table.role),
  ]
);

export const sessionTable = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [userTable.id],
      name: "session_userId_user_id_fk",
    }).onDelete("cascade"),
  ]
);

export const tenantModulesTable = pgTable(
  "tenant_modules",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id").notNull(),
    moduleName: text("module_name").notNull(),
    moduleKey: text("module_key").notNull(), // e.g., 'student_portal', 'hr_portal', etc.
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [schoolsTable.id],
      name: "tenant_modules_school_id_schools_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("tenant_modules_school_module_idx").on(table.schoolId, table.moduleKey),
    index("tenant_modules_school_id_idx").on(table.schoolId),
  ]
);

export const accountTable = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [userTable.id],
      name: "account_userId_user_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("account_provider_id_idx").on(table.providerId, table.accountId),
  ]
);

export const verificationTable = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  }
);

export const userInvitationsTable = pgTable(
  "user_invitations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    roleId: text("role_id").notNull(),
    departmentId: text("department_id"),
    invitedBy: text("invited_by").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    isUsed: boolean("is_used").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [rolesTable.id],
      name: "user_invitations_role_id_roles_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departmentsTable.id],
      name: "user_invitations_department_id_departments_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.invitedBy],
      foreignColumns: [tenantUsersTable.id],
      name: "user_invitations_invited_by_users_id_fk",
    }).onDelete("cascade"),
  ]
);

// Schema exports
export const masterSchema = {
  platformAdminsTable,
  schoolsTable,
  subscriptionPlansTable,
  subscriptionsTable,
  invoicesTable,
  tenantModulesTable,
  // Include existing tables for master DB
  userTable,
  sessionTable,
  accountTable,
  verificationTable,
};

export const tenantSchema = {
  academicYearsTable,
  classesTable,
  subjectsTable,
  departmentsTable,
  rolesTable,
  rolePermissionsTable,
  tenantUsersTable,
  studentsTable,
  staffTable,
  announcementsTable,
  messagesTable,
  userInvitationsTable,
  auditLogsTable,
  // Messaging tables
  conversationsTable,
  conversationMembersTable,
  messageReadStatusTable,
  // Broadcast tables
  broadcastsTable,
  broadcastDeliveriesTable,
  // Finance tables
  feesTable,
  studentFeesTable,
  paymentsTable,
  paystackConfigTable,
  smsProvidersTable,
  emailProvidersTable,
  transactionLedgerTable,
  studentInvoicesTable,
  notificationSettingsTable,
  systemSettingsTable,
  // Receipt tables
  receiptTemplatesTable,
  receiptsTable,
  // Gradebook and assessment tables
  gradebookTable,
  assessmentsTable,
  examsTable,
  reportCardTemplatesTable,
  reportCardsTable,
  studentProgressTable,
  gradingScalesTable,
};

// Type exports
export type PlatformAdmin = typeof platformAdminsTable.$inferSelect;
export type School = typeof schoolsTable.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type AcademicYear = typeof academicYearsTable.$inferSelect;
export type Class = typeof classesTable.$inferSelect;
export type Subject = typeof subjectsTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
export type Role = typeof rolesTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type TenantUser = typeof tenantUsersTable.$inferSelect;
export type Student = typeof studentsTable.$inferSelect;
export type Staff = typeof staffTable.$inferSelect;
export type Announcement = typeof announcementsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type UserInvitation = typeof userInvitationsTable.$inferSelect;
export type TenantModule = typeof tenantModulesTable.$inferSelect;
// Messaging types
export type Conversation = typeof conversationsTable.$inferSelect;
export type ConversationMember = typeof conversationMembersTable.$inferSelect;
export type MessageReadStatus = typeof messageReadStatusTable.$inferSelect;
// Broadcast types
export type Broadcast = typeof broadcastsTable.$inferSelect;
export type BroadcastDelivery = typeof broadcastDeliveriesTable.$inferSelect;
// Finance types
export type Fee = typeof feesTable.$inferSelect;
export type StudentFee = typeof studentFeesTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type PaystackConfig = typeof paystackConfigTable.$inferSelect;
export type SMSProvider = typeof smsProvidersTable.$inferSelect;
export type EmailProvider = typeof emailProvidersTable.$inferSelect;
export type TransactionLedger = typeof transactionLedgerTable.$inferSelect;
export type StudentInvoice = typeof studentInvoicesTable.$inferSelect;
export type NotificationSettings = typeof notificationSettingsTable.$inferSelect;
export type SystemSettings = typeof systemSettingsTable.$inferSelect;
export type ReceiptTemplate = typeof receiptTemplatesTable.$inferSelect;
export type Receipt = typeof receiptsTable.$inferSelect;
// Gradebook and assessment types
export type Gradebook = typeof gradebookTable.$inferSelect;
export type Assessment = typeof assessmentsTable.$inferSelect;
export type Exam = typeof examsTable.$inferSelect;
export type ReportCardTemplate = typeof reportCardTemplatesTable.$inferSelect;
export type ReportCard = typeof reportCardsTable.$inferSelect;
export type StudentProgress = typeof studentProgressTable.$inferSelect;
export type GradingScale = typeof gradingScalesTable.$inferSelect;

// Keep existing type exports for backward compatibility
export type User = typeof userTable.$inferSelect;
export type Session = typeof sessionTable.$inferSelect;
export type Account = typeof accountTable.$inferSelect;
export type Verification = typeof verificationTable.$inferSelect;

