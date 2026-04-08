/**
 * SMS Send API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { SmsService } from '@/services/sms.service';
import { requirePermission } from '@/lib/guards/require-permission';
import { AuditLogger } from '@/lib/auth/audit-logger';
import { AuditAction } from '@/lib/auth/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await requirePermission(userId, 'sms.send');
    if (!hasPermission.allowed) {
      return NextResponse.json({ error: hasPermission.error }, { status: 403 });
    }

    const body = await request.json();
    const { to, message, type = 'single' } = body;

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (type === 'single' && !to) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    if (type === 'bulk' && (!Array.isArray(to) || to.length === 0)) {
      return NextResponse.json({ error: 'Recipients array is required for bulk sending' }, { status: 400 });
    }

    // Initialize SMS service
    const smsService = new SmsService({
      provider: process.env.SMS_PROVIDER || 'twilio',
      apiKey: process.env.SMS_API_KEY || '',
      apiSecret: process.env.SMS_API_SECRET,
      senderId: process.env.SMS_SENDER_ID,
    });

    let result;

    if (type === 'bulk') {
      result = await smsService.sendBulkSms(to, message);
    } else {
      result = await smsService.sendSms(to, message);
    }

    // Audit log
    await AuditLogger.logUserAction(
      userId,
      AuditAction.CREATE,
      'sms',
      undefined,
      {
        type,
        recipientCount: type === 'bulk' ? to.length : 1,
        success: result.success,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await requirePermission(userId, 'sms.read');
    if (!hasPermission.allowed) {
      return NextResponse.json({ error: hasPermission.error }, { status: 403 });
    }

    // Initialize SMS service
    const smsService = new SmsService({
      provider: process.env.SMS_PROVIDER || 'twilio',
      apiKey: process.env.SMS_API_KEY || '',
      apiSecret: process.env.SMS_API_SECRET,
      senderId: process.env.SMS_SENDER_ID,
    });

    const balance = await smsService.getBalance();

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('SMS balance check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
