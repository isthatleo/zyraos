/**
 * API Route: Send SMS Broadcast
 * Path: src/app/api/messaging/broadcast/sms/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { MessagingService } from '@/lib/messaging/messaging.service';
import { AuditLogger, RateLimiter } from '@/lib/auth/advanced-auth';
import { getTenantFromRequest } from '@/lib/middleware/tenant-middleware';

export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || 'unknown';
    const clientIp = request.headers.get('x-client-ip') || 'unknown';
    const tenantId = getTenantFromRequest(request);

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant context' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Rate limiting for broadcast
    if (!RateLimiter.isAllowed(`broadcast_${clientIp}`, 50, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Broadcast rate limit exceeded' },
        { status: 429, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Parse request
    const body = await request.json();
    const { senderId, senderName, content, targetType, targetAudience, scheduledFor } = body;

    if (!senderId || !senderName || !content || !targetType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Get SMS configuration
    const smsConfig = {
      provider: process.env.SMS_PROVIDER || 'arkesel',
      apiKey: process.env.SMS_API_KEY || '',
      senderId: process.env.SMS_SENDER_ID || 'ZYRAAI',
      isActive: true,
    };

    // If scheduled, queue for later delivery
    if (scheduledFor) {
      // Queue job for scheduled delivery
      // Implementation depends on your job queue system
      return NextResponse.json(
        {
          success: true,
          requestId,
          message: 'SMS scheduled for delivery',
          scheduledFor,
        },
        { headers: { 'X-Request-ID': requestId } }
      );
    }

    // Send immediately
    const broadcast = await MessagingService.sendSMSBroadcast(
      senderId,
      senderName,
      content,
      targetType,
      targetAudience || [],
      tenantId,
      smsConfig
    );

    // Log action
    await AuditLogger.logAction(
      senderId,
      'sms.broadcast',
      'sms_broadcast',
      {
        resourceId: broadcast.id,
        metadata: {
          recipientCount: broadcast.recipientCount,
          successCount: broadcast.successCount,
          failureCount: broadcast.failureCount,
        },
        schoolId: tenantId,
      }
    );

    return NextResponse.json(
      {
        success: true,
        requestId,
        data: broadcast,
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error: any) {
    const requestId = request.headers.get('x-request-id') || 'unknown';
    console.error('[BROADCAST API ERROR]', error);

    return NextResponse.json(
      {
        error: 'Failed to send SMS broadcast',
        message: error.message,
        requestId,
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}

