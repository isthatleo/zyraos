/**
 * Comprehensive Messaging End-to-End Flow Documentation
 * Path: MESSAGING_SYSTEM_GUIDE.md
 */

# ZyraAI Messaging System - Complete Implementation Guide

## Overview

This guide documents the complete messaging and broadcasting system for the ZyraAI Education Operations System, including:

1. **Internal Chat** - Real-time peer-to-peer messaging
2. **SMS Broadcast** - One-to-many SMS distribution
3. **Email Broadcast** - One-to-many email distribution
4. **Communication Settings** - Provider configuration and management

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Components                           │
├─────────────────────────────────────────────────────────────────┤
│ • BroadcastsPage      (SMS/Email broadcast interface)          │
│ • InternalChatComponent (Real-time chat)                        │
│ • CommunicationSettings (Provider configuration)                │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes                                  │
├─────────────────────────────────────────────────────────────────┤
│ • /api/messaging/send (Internal messages)                       │
│ • /api/messaging/broadcast/sms (SMS broadcast)                  │
│ • /api/messaging/broadcast/email (Email broadcast)              │
│ • /api/messaging/conversations (Get conversations)              │
│ • /api/messaging/messages (Get message history)                 │
│ • /api/messaging/mark-read (Mark as read)                       │
│ • /api/messaging/settings (Configuration)                       │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│ • MessagingService (Core business logic)                        │
│ • SMSService (Multi-provider SMS)                               │
│ • EmailService (Email delivery)                                 │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Providers                             │
├─────────────────────────────────────────────────────────────────┤
│ • mNotify, Arkesel, Hubtel, Twilio, Termii (SMS)               │
│ • Resend, SendGrid, Mailgun (Email)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## End-to-End Flows

### Flow 1: Administrative SMS Broadcast (One-to-Many)

**Actors:** School Administrator
**Goal:** Send SMS reminder to all parents about parent-teacher conference

**Steps:**

1. **Initiation**
   - Administrator navigates to `/messaging/broadcasts`
   - Page loads with UI for broadcast composition
   - SMS gateway status shows "Online" with current balance

2. **Channel Selection**
   - Administrator selects "SMS" channel
   - System updates UI to show SMS-specific options (character count, pages, credits)

3. **Target Selection**
   - Administrator clicks "Target Audience" dropdown
   - Selects "All Parents"
   - System confirms: "This will send to 250 parents"

4. **Message Composition**
   - Administrator types: "Parent-Teacher Conference on March 20, 4-6 PM. Please register at the school office."
   - System shows:
     - Character count: 87
     - SMS pages: 1
     - Credit cost: 1 per recipient = 250 credits total
   - Administrator reviews message for accuracy

5. **Scheduling (Optional)**
   - Administrator can toggle "Schedule for later"
   - Selects date/time: "March 18, 9:00 AM"
   - Or send immediately by clicking "Send SMS"

6. **Execution**
   - System validates:
     - Tenant context (school identity)
     - User permissions (can send broadcasts)
     - SMS balance >= 250 credits
     - Rate limit not exceeded
   
7. **Sending**
   ```
   API Call: POST /api/messaging/broadcast/sms
   Body: {
     senderId: "admin_123",
     senderName: "School Admin",
     content: "Parent-Teacher Conference on March 20...",
     targetType: "all_parents",
     targetAudience: [],
     scheduledFor: null // Send immediately
   }
   ```

8. **Backend Processing**
   - MessagingService.sendSMSBroadcast() called
   - Fetches 250 parent phone numbers from database
   - Initializes SMSService with mNotify config
   - Validates SMS provider credentials
   - Checks balance: 250 credits available ✓
   - Sends SMS to each recipient (parallel or sequential)
   - Results: 248 success, 2 failed (invalid numbers)

9. **Logging & Tracking**
   - AuditLogger records:
     - User: admin_123
     - Action: sms.broadcast
     - Recipients: 250
     - Success: 248
     - Failure: 2
   - SMSBroadcast record created in database with:
     - Unique ID, status, sent timestamp
     - Message IDs for each individual SMS

10. **User Feedback**
    - Toast notification: "SMS Sent Successfully"
    - Broadcast appears in "Recent SMS Broadcasts" panel:
      - Status: SENT ✓
      - Recipients: 248/250
      - Time: 2024-03-15 09:00:15
    - Admin can click "View Details" for full report

11. **Notification Delivery**
    - Parents receive SMS on their phones within seconds
    - Message: "Parent-Teacher Conference on March 20..."
    - SMS shows sender ID: "ZYRAAI"

---

### Flow 2: Real-time Peer Interaction (One-to-One Chat)

**Actors:** Student, Teacher
**Goal:** Real-time conversation about assignment submission

**Steps:**

1. **Notification**
   - Teacher sends first message to student
   - System checks notification preferences:
     - SMS enabled: Yes
     - Email enabled: Yes
     - In-app chat enabled: Yes
   - Student receives notification:
     - Bell icon in header shows red badge with "1"
     - Message preview appears in notification center

2. **Access Chat**
   - Student clicks notification bell → "New message from Ms. Johnson (Teacher)"
   - Or navigates to Messages tab
   - InternalChatComponent loads with user list
   - Shows "Ms. Johnson" as online (green indicator)

3. **View Conversation**
   - User list shows:
     ```
     👩‍🏫 Ms. Johnson
     Teacher
     ● Online
     ```
   - Student clicks Ms. Johnson's name
   - Chat window opens
   - Header shows:
     - Avatar + "Ms. Johnson"
     - Role: "Teacher"
     - Status: "● Online"
   - Message history loads:
     ```
     [Ms. Johnson - 14:32]
     "Hi Sarah, did you submit the assignment?"
     
     [Sarah - 14:35]
     "Yes, I submitted it this morning"
     ```

4. **Real-time Synchronization**
   - Teacher types new message: "Great! I'll review it tonight"
   - Hook useMessaging() detects new message via polling/WebSocket
   - Message appears instantly in student's chat:
     ```
     [Ms. Johnson - 14:36]
     "Great! I'll review it tonight"
     ✓✓ (double checkmark = read)
     ```

5. **Student Response**
   - Student types in textarea: "Thank you Ms. Johnson. Can you let me know if there are any corrections needed?"
   - Presses Ctrl+Enter to send (or clicks Send button)
   - Shift+Enter creates new line without sending

6. **Message Sending**
   ```
   API Call: POST /api/messaging/send
   Body: {
     senderId: "student_789",
     recipientId: "teacher_456",
     content: "Thank you Ms. Johnson...",
     schoolId: "academy-school"
   }
   ```

7. **Backend Processing**
   - Message created with:
     - ID: msg_1710500160_abc123
     - Status: "sent"
     - Timestamp: 2024-03-15 14:36:00
   - Persisted to database
   - AuditLogger records data.access for message retrieval

8. **Real-time Delivery**
   - Teacher's InternalChatComponent polls API every 5 seconds
   - Or WebSocket pushes message instantly
   - Teacher's chat updates with new message:
     ```
     [Sarah - 14:36]
     "Thank you Ms. Johnson..."
     ✓ (single checkmark = sent)
     ```

9. **Read Status**
   - Teacher reads message
   - System calls markAsRead()
   - Updates message status: "read"
   - Student's chat updates:
     ```
     [Sarah - 14:36]
     "Thank you Ms. Johnson..."
     ✓✓ (double checkmark = read)
     ```

10. **Conversation Management**
    - Both users' "Conversations" list shows:
      - Latest message preview
      - Unread count
      - Last activity time
      - Ability to search conversations
      - Mark all as read

11. **Notification Preferences**
    - Student receives in-app notification only (no SMS/Email for internal chat)
    - Quiet hours respected (14:36 is outside quiet hours: 22:00-07:00)

---

## Implementation Guide

### File Structure

```
src/
├── types/
│   └── messaging.ts              # All type definitions
├── lib/
│   └── messaging/
│       └── messaging.service.ts   # Core business logic
├── hooks/
│   └── use-messaging.ts           # React hooks for messaging
├── components/
│   └── messaging/
│       ├── broadcasts-page.tsx    # SMS/Email broadcast UI
│       ├── internal-chat.tsx      # Chat interface
│       └── communication-settings.tsx # Settings UI
└── app/
    └── api/
        └── messaging/
            ├── send/route.ts           # Internal messages
            ├── broadcast/
            │   ├── sms/route.ts        # SMS broadcast
            │   └── email/route.ts      # Email broadcast
            ├── conversations/route.ts  # Get conversations
            ├── messages/route.ts       # Get message history
            ├── mark-read/route.ts      # Mark as read
            └── settings/route.ts       # Configuration
```

### Key Files

1. **src/types/messaging.ts**
   - Message, Conversation, SMSBroadcast, EmailBroadcast
   - CommunicationSettings, MessageTemplate, NotificationPreference

2. **src/lib/messaging/messaging.service.ts**
   - sendChatMessage()
   - sendSMSBroadcast()
   - sendEmailBroadcast()
   - getConversation()
   - getMessageHistory()
   - markAsRead()

3. **src/hooks/use-messaging.ts**
   - useMessaging() hook for React components
   - Fetch conversations and messages
   - Send messages
   - Real-time updates

4. **API Routes**
   - Full CRUD operations for messages
   - Broadcast distribution
   - Configuration management
   - Rate limiting and validation

---

## Integration Checklist

- [ ] Database schema created for messages and conversations
- [ ] SMS providers configured in .env
- [ ] Email provider configured in .env
- [ ] WebSocket/real-time implementation (optional)
- [ ] Notification preferences implemented
- [ ] Audit logging configured
- [ ] Rate limiting configured
- [ ] Message templates created
- [ ] Scheduled delivery queue implemented
- [ ] Email templates created
- [ ] Conversation caching implemented
- [ ] User search implemented
- [ ] Message search implemented

---

## Security Considerations

1. **Authentication**
   - Verify user identity before sending/receiving messages
   - Check user role and permissions

2. **Authorization**
   - Only allow users to send to allowed recipients
   - Verify broadcast permissions

3. **Rate Limiting**
   - Limit message sending per user
   - Limit broadcast frequency
   - Prevent spam

4. **Data Validation**
   - Validate phone numbers for SMS
   - Validate email addresses
   - Sanitize message content

5. **Encryption**
   - Encrypt sensitive data at rest
   - Use HTTPS for all API calls
   - Store API keys securely

6. **Audit Trail**
   - Log all message activity
   - Track who sent what to whom
   - Monitor broadcast distribution

---

## Performance Optimization

1. **Database**
   - Index: user_id, recipient_id, created_at
   - Paginate message history
   - Archive old messages

2. **Caching**
   - Cache conversation list
   - Cache user list
   - Cache recent messages

3. **API**
   - Batch message queries
   - Implement pagination
   - Use compression

4. **Frontend**
   - Lazy load messages
   - Virtualize long message lists
   - Debounce search

---

## Monitoring & Analytics

Track:
- Message delivery rates
- SMS provider success/failure
- Email delivery metrics
- User engagement
- Broadcast reach
- Performance metrics

---

## Future Enhancements

1. File sharing in chat
2. Video/audio calls
3. Message reactions/emoji
4. Typing indicators
5. Message scheduling UI
6. Template builder
7. Analytics dashboard
8. Mobile push notifications
9. Message search
10. Conversation export

