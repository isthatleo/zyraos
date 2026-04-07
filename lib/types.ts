// Type definitions for messaging, broadcast, and finance modules

// ==================== MESSAGING TYPES ====================

export interface Conversation {
  id: string
  type: "direct" | "group"
  name?: string
  createdBy: string
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ConversationMember {
  id: string
  conversationId: string
  userId: string
  role: "owner" | "member"
  joinedAt: Date
  leftAt?: Date
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachments?: string[]
  isEdited: boolean
  editedAt?: Date
  createdAt: Date
}

export interface MessageReadStatus {
  id: string
  messageId: string
  userId: string
  readAt: Date
}

export interface MessageThread {
  message: Message
  sender: {
    id: string
    name: string
    email: string
    image?: string
  }
  isRead: boolean
  readAt?: Date
}

// ==================== BROADCAST TYPES ====================

export type BroadcastChannel = "sms" | "email" | "in-app"
export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "failed"
export type TargetAudience =
  | "all"
  | "students"
  | "teachers"
  | "parents"
  | "staff"
  | "class"
  | "department"
  | "custom"

export interface Broadcast {
  id: string
  createdBy: string
  title: string
  content: string
  channel: BroadcastChannel
  targetAudience: TargetAudience
  targetAudienceIds?: string[]
  status: BroadcastStatus
  scheduledAt?: Date
  sentAt?: Date
  failedAt?: Date
  metadata?: {
    characterCount?: number
    smsCount?: number
    totalRecipients?: number
  }
  createdAt: Date
  updatedAt: Date
}

export type BroadcastDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced"

export interface BroadcastDelivery {
  id: string
  broadcastId: string
  userId: string
  phone?: string
  email?: string
  status: BroadcastDeliveryStatus
  deliveryError?: string
  deliveredAt?: Date
  failedAt?: Date
  externalReference?: string
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface BroadcastReport {
  broadcastId: string
  stats: {
    total: number
    sent: number
    delivered: number
    failed: number
    pending: number
    bounced: number
  }
  deliveries: BroadcastDelivery[]
}

export interface CreateBroadcastInput {
  title: string
  content: string
  channel: BroadcastChannel
  targetAudience: TargetAudience
  targetAudienceIds?: string[]
  scheduledAt?: Date
}

// ==================== FINANCE TYPES ====================

export type FeeType =
  | "tuition"
  | "activity"
  | "transport"
  | "uniform"
  | "lunch"
  | "other"
export type FeeStatus = "paid" | "partial" | "unpaid" | "overdue"
export type PaymentMethod = "card" | "mobile_money" | "bank_transfer" | "cash"
export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"

export interface Fee {
  id: string
  feeType: FeeType
  name: string
  description?: string
  amount: number
  semester: string
  academicYearId: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface StudentFee {
  id: string
  studentId: string
  feeId: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  status: FeeStatus
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Payment {
  id: string
  studentId: string
  studentFeeId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentReference: string
  provider?: string
  status: PaymentStatus
  providerResponse?: any
  completedAt?: Date
  failedAt?: Date
  refundedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TransactionLedger {
  id: string
  paymentId?: string
  studentId: string
  type: "payment" | "refund" | "adjustment" | "fee_waiver"
  amount: number
  description?: string
  reference?: string
  balance: number
  createdAt: Date
}

export interface StudentInvoice {
  id: string
  invoiceNumber: string
  studentId: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  dueDate?: Date
  issuedDate: Date
  status: "unpaid" | "partial" | "paid" | "overdue" | "cancelled"
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface FinanceSummary {
  totalFees: number
  totalPaid: number
  outstandingBalance: number
  fees: StudentFee[]
}

export interface PaymentInput {
  studentId: string
  studentFeeId: string
  amount: number
  paymentMethod: PaymentMethod
  provider?: string
}

// ==================== SETTINGS TYPES ====================

export interface SMSProviderConfig {
  provider: string
  apiKey: string
  accountSid?: string
  senderName: string
  status: "active" | "inactive" | "error"
}

export interface EmailProviderConfig {
  provider: string
  apiKey: string
  senderEmail: string
  senderName: string
  status: "active" | "inactive" | "error"
}

export interface PaystackConfig {
  publicKey: string
  secretKey: string
  testMode: boolean
}

export interface NotificationSettings {
  userId: string
  emailNotifications: boolean
  smsNotifications: boolean
  inAppNotifications: boolean
  broadcastNotifications: boolean
  paymentNotifications: boolean
}

export interface SystemSettings {
  key: string
  value: any
  category: "email" | "sms" | "payment" | "general" | "academic"
  description?: string
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export interface ConversationResponse extends Conversation {
  lastMessage?: string
  unreadCount?: number
  members?: ConversationMember[]
}

export interface MessageResponse extends Message {
  sender: {
    id: string
    name: string
    email: string
    image?: string
  }
  isCurrentUser?: boolean
}

// ==================== PAYSTACK TYPES ====================

export interface PaystackWebhookData {
  event: string
  data: {
    id: number
    reference: string
    amount: number
    status: string
    customer: {
      email: string
      phone: string
    }
    [key: string]: any
  }
}

export interface PaystackAuthorizationUrl {
  authorization_url: string
  access_code: string
  reference: string
}

// ==================== ANALYTICS TYPES ====================

export interface DashboardMetrics {
  totalCollection: number
  totalExpenses: number
  refunds: number
  totalStudents: number
  outstandingBalance: number
  paidFees: number
  partialFees: number
  unpaidFees: number
}

export interface CommunicationMetrics {
  totalMessages: number
  activeUsers: number
  broadcastsSent: number
  averageDeliveryRate: number
  messagesByChannel: {
    sms: number
    email: number
    inApp: number
  }
}

export interface FinanceMetrics {
  totalCollection: number
  totalExpenses: number
  netProfit: number
  collectionRate: number
  averagePaymentMethod: PaymentMethod
}

// ==================== FILTER TYPES ====================

export interface MessageFilter {
  conversationId?: string
  senderId?: string
  isRead?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface BroadcastFilter {
  status?: BroadcastStatus
  channel?: BroadcastChannel
  targetAudience?: TargetAudience
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface PaymentFilter {
  studentId?: string
  status?: PaymentStatus
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ==================== ENUM TYPES ====================

export const BroadcastChannels = {
  SMS: "sms",
  EMAIL: "email",
  IN_APP: "in-app",
} as const

export const TargetAudiences = {
  ALL: "all",
  STUDENTS: "students",
  TEACHERS: "teachers",
  PARENTS: "parents",
  STAFF: "staff",
  CLASS: "class",
  DEPARTMENT: "department",
  CUSTOM: "custom",
} as const

export const FeeStatuses = {
  PAID: "paid",
  PARTIAL: "partial",
  UNPAID: "unpaid",
  OVERDUE: "overdue",
} as const

export const PaymentMethods = {
  CARD: "card",
  MOBILE_MONEY: "mobile_money",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
} as const

// ==================== FORM INPUT TYPES ====================

export interface CreateConversationInput {
  type: "direct" | "group"
  name?: string
  participantIds: string[]
}

export interface SendMessageInput {
  conversationId: string
  senderId: string
  content: string
  attachments?: string[]
}

export interface CreateBroadcastPayload {
  createdBy: string
  title: string
  content: string
  channel: BroadcastChannel
  targetAudience: TargetAudience
  targetAudienceIds?: string[]
  scheduledAt?: string
}

