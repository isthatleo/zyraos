/**
 * Messaging Types and Interfaces
 * Path: src/types/messaging.ts
 */

export type MessageType = 'sms' | 'email' | 'internal_chat';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type BroadcastTarget = 'all_students' | 'all_parents' | 'all_teachers' | 'all_staff' | 'entire_school' | 'custom' | 'individual';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  recipientAvatar?: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  schoolId: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage?: Message;
  lastMessageAt: Date;
  unreadCount: number;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SMSBroadcast {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  targetType: BroadcastTarget;
  targetAudience?: string[]; // Array of user IDs or roles
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: 'pending' | 'sent' | 'partial' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  messageIds: string[]; // IDs of individual messages sent
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailBroadcast {
  id: string;
  senderId: string;
  senderName: string;
  subject: string;
  content: string;
  htmlContent?: string;
  targetType: BroadcastTarget;
  targetAudience?: string[]; // Array of user IDs or roles
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: 'pending' | 'sent' | 'partial' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  messageIds: string[]; // IDs of individual messages sent
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationSettings {
  id: string;
  schoolId: string;
  smsProvider: {
    name: 'arkesel' | 'hubtel' | 'twilio' | 'termii' | 'mnotify';
    isActive: boolean;
    apiKey?: string;
  };
  emailProvider: {
    name: 'resend' | 'sendgrid' | 'mailgun';
    isActive: boolean;
    apiKey?: string;
  };
  automatedNotifications: {
    absenceNotifications: boolean;
    gradeNotifications: boolean;
    feeNotifications: boolean;
    eventReminders: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'sms' | 'email';
  subject?: string; // For email
  content: string;
  variables: string[]; // e.g., ['studentName', 'date', 'teacher']
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  enableSMS: boolean;
  enableEmail: boolean;
  enableInAppChat: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

