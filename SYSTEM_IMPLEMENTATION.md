# School Management System - Complete Implementation Guide

## Overview

This is a comprehensive School Management System built with Next.js 14, featuring:
- **Messaging & Communication Hub**: Real-time messaging between students, teachers, and parents
- **Broadcast System**: SMS, Email, and In-App announcements
- **Finance & Fee Management**: Student fee tracking, payment processing with Paystack integration
- **Admin Dashboard**: Analytics, reporting, and system configuration
- **Settings Management**: Email, SMS, and payment gateway configuration

## Project Structure

```
zyraos/
├── app/
│   ├── api/
│   │   ├── tenant/
│   │   │   ├── broadcasts/
│   │   │   │   ├── route.ts              # Broadcast CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── report/
│   │   │   │           └── route.ts      # Broadcast reports
│   │   │   ├── conversations/
│   │   │   │   ├── route.ts              # Conversation CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── members/
│   │   │   │           └── route.ts      # Manage conversation members
│   │   │   ├── messages/
│   │   │   │   └── route.ts              # Message operations
│   │   │   ├── fees/
│   │   │   │   └── route.ts              # Fee management
│   │   │   ├── payments/
│   │   │   │   └── route.ts              # Payment processing
│   │   │   ├── invoices/
│   │   │   │   └── route.ts              # Student invoices
│   │   │   └── settings/
│   │   │       ├── route.ts              # Save settings
│   │   │       └── test/
│   │   │           └── route.ts          # Test provider connection
│   │   └── webhooks/
│   │       └── paystack/
│   │           └── route.ts              # Paystack webhook handler
│   └── [tenant]/
│       └── ...existing pages
│
├── components/
│   ├── messaging-component.tsx           # Chat UI
│   ├── broadcast-component.tsx           # Create/manage broadcasts
│   ├── broadcast-reports-component.tsx   # Broadcast analytics
│   ├── communication-analytics.tsx       # Communication metrics
│   ├── finance-component.tsx             # Fee payment UI
│   ├── finance-analytics.tsx             # Finance metrics
│   ├── dashboard-analytics.tsx           # Main dashboard
│   ├── settings-component.tsx            # SMS/Email/Payment config
│   ├── communication-page.tsx            # Full communication page
│   ├── finance-page.tsx                  # Full finance page
│   └── admin-dashboard-page.tsx          # Admin dashboard page
│
├── lib/
│   ├── db-schema.ts                      # Extended with all tables
│   ├── broadcast-utils.ts                # Helper functions
│   └── ...existing utilities
│
└── public/
    └── ...assets
```

## Database Tables

### Communication Tables
- `conversations` - Direct and group chat conversations
- `conversation_members` - Members in each conversation
- `messages` - Individual messages with attachments
- `message_read_status` - Track message read receipts

### Broadcast Tables
- `broadcasts` - Broadcast campaigns (SMS, Email, In-App)
- `broadcast_deliveries` - Track delivery status per recipient

### Finance Tables
- `fees` - Define fee types and amounts
- `student_fees` - Student-specific fee assignments
- `payments` - Track all payments
- `transaction_ledger` - Complete financial history
- `student_invoices` - Generate invoices

### Configuration Tables
- `sms_providers` - SMS gateway configuration
- `email_providers` - Email service configuration
- `paystack_config` - Paystack payment settings
- `system_settings` - General system settings
- `notification_settings` - User notification preferences

## API Endpoints

### Messaging API

```typescript
// Conversations
GET    /api/tenant/conversations              # List user conversations
POST   /api/tenant/conversations              # Create new conversation
GET    /api/tenant/conversations/[id]/members # Get conversation members
POST   /api/tenant/conversations/[id]/members # Add member to conversation

// Messages
GET    /api/tenant/messages                   # Get messages by conversation
POST   /api/tenant/messages                   # Send new message
```

### Broadcast API

```typescript
GET    /api/tenant/broadcasts                 # List broadcasts
POST   /api/tenant/broadcasts                 # Create broadcast
GET    /api/tenant/broadcasts/[id]/report     # Get broadcast delivery report
```

### Finance API

```typescript
GET    /api/tenant/fees                       # List fees
POST   /api/tenant/fees                       # Create fee
GET    /api/tenant/payments                   # List payments
POST   /api/tenant/payments                   # Create payment
GET    /api/tenant/invoices                   # Get student invoices
```

### Settings API

```typescript
POST   /api/tenant/settings                   # Save SMS/Email/Payment config
POST   /api/tenant/settings/test              # Test provider connection
```

### Webhooks

```typescript
POST   /api/webhooks/paystack                 # Paystack payment confirmation
```

## Key Features

### 1. Messaging System
- Direct and group conversations
- Real-time message delivery (ready for Socket.io integration)
- Message read receipts
- File attachments support
- Message history and search

### 2. Broadcast System
- Multi-channel broadcasts (SMS, Email, In-App)
- Audience segmentation (Students, Teachers, Parents, Custom)
- Message scheduling
- Character counting for SMS
- Delivery tracking and reporting
- Failed message alerts

### 3. Finance Management
- Multiple fee types (Tuition, Activity, Transport, etc.)
- Student fee assignment
- Partial payment tracking
- Paystack payment integration
- Payment history and ledger
- Invoice generation
- Outstanding balance calculation
- Payment method breakdown

### 4. Admin Dashboard
- Real-time analytics
- Revenue trends
- Payment status distribution
- Communication metrics
- User activity tracking
- System health monitoring

### 5. Settings & Configuration
- Email provider setup (SendGrid, Mailgun, Brevo)
- SMS provider configuration (Twilio, Infobip, Africa's Talking)
- Paystack payment gateway setup
- Provider connection testing
- API key management

## Component Usage

### Messaging Component
```typescript
<MessagingComponent 
  currentUserId="user-123" 
  currentUserName="John Doe"
/>
```

### Broadcast Component
```typescript
<BroadcastComponent 
  userId="admin-123" 
  tenantSlug="school-slug"
/>
```

### Finance Component
```typescript
<FinanceComponent 
  studentId="student-123" 
  tenantSlug="school-slug"
/>
```

### Settings Component
```typescript
<SettingsComponent tenantSlug="school-slug" />
```

### Analytics Components
```typescript
<DashboardAnalytics schoolName="School Name" />
<FinanceAnalytics schoolName="School Name" />
<CommunicationAnalytics schoolName="School Name" />
```

## Utility Functions

Located in `lib/broadcast-utils.ts`:

- `calculateSmsCount()` - Calculate SMS message count
- `formatCurrency()` - Format currency display
- `calculateOutstandingBalance()` - Calculate balance due
- `getAudienceLabel()` - Get audience display name
- `generateInvoiceNumber()` - Generate unique invoice numbers
- `generatePaymentReference()` - Generate payment references
- `isValidEmail()` / `isValidPhoneNumber()` - Validation
- `exportToCSV()` - Export data to CSV

## Environment Variables

Add these to `.env.local`:

```env
# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# SMS Provider (example: Twilio)
TWILIO_ACCOUNT_SID=xxxxx
TWILIO_AUTH_TOKEN=xxxxx

# Email Provider (example: SendGrid)
SENDGRID_API_KEY=xxxxx

# Database
DATABASE_URL=postgresql://...
```

## Integration Guide

### Adding to Existing Pages

**Dashboard Page:**
```typescript
import { DashboardAnalytics } from "@/components/dashboard-analytics"

export default function DashboardPage() {
  return <DashboardAnalytics schoolName="School Name" />
}
```

**Communication Page:**
```typescript
import { CommunicationPageComponent } from "@/components/communication-page"

export default function CommunicationPage({ params }) {
  return <CommunicationPageComponent params={params} />
}
```

**Finance Page:**
```typescript
import { FinancePageComponent } from "@/components/finance-page"

export default function FinancePage({ params }) {
  return <FinancePageComponent params={params} />
}
```

### Setting Up Payments

1. Create Paystack account at https://paystack.com
2. Get Public and Secret keys
3. Configure in Settings component
4. Set webhook URL to `https://yourdomain.com/api/webhooks/paystack`

### Setting Up SMS

1. Choose SMS provider (Twilio, Infobip, etc.)
2. Get API credentials
3. Configure in Settings component
4. Test connection before using

### Setting Up Email

1. Choose email provider (SendGrid, Mailgun, etc.)
2. Get API key and sender email
3. Configure in Settings component
4. Test before sending broadcasts

## Security Considerations

1. **API Keys**: Store in environment variables, never commit
2. **Webhooks**: Verify Paystack signature
3. **Rate Limiting**: Implement rate limiting on broadcast endpoints
4. **Input Validation**: All user inputs are validated
5. **RBAC**: Use existing role permission system
6. **Data Privacy**: Sensitive data encrypted at rest

## Performance Optimization

1. **Pagination**: All list endpoints support pagination
2. **Indexing**: Database indexes on frequently queried fields
3. **Caching**: Consider Redis for frequently accessed data
4. **Real-time**: Socket.io ready for messaging updates
5. **Analytics**: Pre-calculated aggregates for dashboards

## Future Enhancements

1. **Socket.io Integration**: Real-time messaging and notifications
2. **File Uploads**: S3/Cloudinary for message attachments
3. **Message Reactions**: Emoji reactions on messages
4. **Message Threading**: Threaded replies
5. **Scheduled Messages**: Schedule broadcasts for future delivery
6. **SMS Receipts**: Delivery confirmation from SMS providers
7. **Email Templates**: Pre-built email templates
8. **Payment Reconciliation**: Automatic reconciliation with payment provider
9. **Refunds**: Handle payment refunds
10. **Recurring Payments**: Subscription-based fees

## Troubleshooting

**Payments not processing:**
- Check Paystack API keys are correct
- Verify webhook URL in Paystack dashboard
- Check database connection for payment records

**SMS not sending:**
- Verify SMS provider API credentials
- Check sender name format (max 11 chars)
- Validate phone numbers
- Check available SMS credits

**Messages not appearing:**
- Verify conversation exists and user is member
- Check message creation was successful
- Implement Socket.io for real-time updates

## Support

For issues or questions, check:
- Database schema in `lib/db-schema.ts`
- API route implementations in `app/api/`
- Component implementations in `components/`
- Utility functions in `lib/broadcast-utils.ts`

## License

All rights reserved. School Management System.

