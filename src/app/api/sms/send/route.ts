## 2. Messaging Feature Sets by Page
### A. Messaging & Broadcasts Page (Administrative)
This page acts as a centralized broadcast center for high-level announcements.
• Broadcast Channels: Supports switching between SMS and Email channels.
• Target Audience Selection: A dropdown menu to select recipients including:
    • Entire School Community.
• Specific roles: All Students, All Parents, All Teachers, All Accountants, All Staff.
• Granular targeting: Custom Numbers or Specific Individual.
• Compose Interface: Text area for message content with a character/page counter for SMS.
  • Scheduling: "Schedule for later" toggle for time-delayed delivery.
• Delivery Analytics: A "Recent SMS Broadcasts" sidebar showing message status (e.g., SENT), recipient count, and timestamps.
### B. Internal Chat Workspace
Designed for real-time interaction between active users (e.g., Student to Admin).
• User Directory/Message List: Searchable list of recent conversations showing user names, roles, and "last seen" status.
• Chat Window Elements:
    • User Header: Displays the contact’s name, role (e.g., "School Owner"), and a real-time Online/Offline indicator.
• Message Bubbles: Color-coded bubbles distinguishing sent vs. received messages with integrated timestamps.
• Status Indicators: Includes "unseen" message badges and "read" status notifications.
• Input Controls: A multi-line text input supporting "Shift + Enter" for new lines and a dedicated "Send" button.
### C. Communication Settings (Configuration)
The backend infrastructure that enables external messaging.
• Provider Integration: Dedicated fields for SMS Gateway (e.g., mNotify, Hubtel, Twilio) and Email Provider (e.g., Resend).
• API Management: Fields for API Keys and "Test" buttons to verify connectivity.
• Automated Notification Preferences: Toggles for system-triggered messages, such as:
• Absence Notifications (sent when a student is marked absent).
• Grade Notifications (sent upon report card publication).
• Fee Notifications (for invoices and receipts)./**
 * Example API Route: Send SMS
 * Path: src/app/api/sms/send/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { SMSService } from '@/lib/sms/sms.service';
import { AuditLogger, RateLimiter } from '@/lib/auth/advanced-auth';
import { getTenantFromRequest } from '@/lib/middleware/tenant-middleware';

export async function POST(request: NextRequest) {
  try {
    // 1. Get client IP and validate rate limit
    const clientIp = request.headers.get('x-client-ip') || 'unknown';
    const requestId = request.headers.get('x-request-id') || 'unknown';

    if (!RateLimiter.isAllowed(`sms_${clientIp}`, 50, 60 * 1000)) {
      await AuditLogger.logSecurityEvent(
        'unknown',
        'rate_limit_exceeded',
        'medium',
        {
          ipAddress: clientIp,
          details: 'SMS API rate limit exceeded',
        }
      );

      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-Request-ID': requestId } }
      );
    }

    // 2. Get tenant context
    const tenantId = getTenantFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant context' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { phoneNumber, message, recipientCount } = body;

    // Validate input
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, message' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // 4. Get SMS configuration from database
    // This would come from your school's SMS settings
    const smsConfig = {
      provider: 'arkesel' as const,
      apiKey: process.env.ARKESEL_API_KEY || '',
      senderId: process.env.SMS_SENDER_ID || 'ZYRAAI',
      isActive: true,
    };

    // 5. Initialize SMS service
    const smsService = new SMSService(smsConfig);

    // 6. Validate credentials
    const isValid = await smsService.validateCredentials();
    if (!isValid) {
      await AuditLogger.logSecurityEvent(
        'system',
        'sms_config_invalid',
        'high',
        {
          schoolId: tenantId,
          details: 'SMS provider credentials are invalid',
        }
      );

      return NextResponse.json(
        { error: 'SMS service not properly configured' },
        { status: 503, headers: { 'X-Request-ID': requestId } }
      );
    }

    // 7. Get balance
    const balance = await smsService.getBalance();
    if (balance <= 0) {
      await AuditLogger.logSecurityEvent(
        'system',
        'sms_insufficient_balance',
        'high',
        {
          schoolId: tenantId,
          details: `Insufficient SMS balance: ${balance}`,
        }
      );

      return NextResponse.json(
        { error: 'Insufficient SMS credits' },
        { status: 402, headers: { 'X-Request-ID': requestId } }
      );
    }

    // 8. Send SMS
    let result;
    if (Array.isArray(phoneNumber)) {
      result = await smsService.sendBulk(phoneNumber, message);
    } else {
      result = await smsService.send(phoneNumber, message);
    }

    // 9. Log action
    await AuditLogger.logAction(
      'sms_api',
      'sms.send',
      'sms_message',
      {
        metadata: {
          recipientCount: Array.isArray(phoneNumber) ? phoneNumber.length : 1,
          success: result.success || result.successful > 0,
        },
        schoolId: tenantId,
      }
    );

    // 10. Return response
    return NextResponse.json(
      {
        success: true,
        requestId,
        data: result,
        balance: await smsService.getBalance(),
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error: any) {
    const requestId = request.headers.get('x-request-id') || 'unknown';

    console.error('[SMS API ERROR]', error);

    return NextResponse.json(
      {
        error: 'Failed to send SMS',
        message: error.message,
        requestId,
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}

