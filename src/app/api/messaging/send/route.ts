/**
 * API Route: Send Internal Message
 * Path: src/app/api/messaging/send/route.ts
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

    // Rate limiting
    if (!RateLimiter.isAllowed(`message_${clientIp}`, 100, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Parse request
    const body = await request.json();
    const { senderId, recipientId, content } = body;

    if (!senderId || !recipientId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: senderId, recipientId, content' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Send message
    const message = await MessagingService.sendChatMessage(
      senderId,
      recipientId,
      content,
      tenantId
    );

    return NextResponse.json(
      {
        success: true,
        requestId,
        data: message,
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error: any) {
    const requestId = request.headers.get('x-request-id') || 'unknown';
    console.error('[MESSAGE API ERROR]', error);

    return NextResponse.json(
      {
        error: 'Failed to send message',
        message: error.message,
        requestId,
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}

