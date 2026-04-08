/**
 * Implementation Guide: Summary of Advanced Systems
 * 
 * This document explains how to integrate and use all the advanced features
 * implemented for the ZyraAI Education Operations System.
 */

# ZyraAI Advanced Systems Implementation Guide

## Overview

This guide covers the implementation of four critical infrastructure systems:

1. **SMS Gateway** - Multi-provider SMS management
2. **Guards System** - Granular permission checks
3. **Multi-Tenant Middleware** - Subdomain routing and tenant isolation
4. **Advanced Auth** - Audit logging, rate limiting, and session management

---

## 1. SMS Gateway System

### Location
- Interface: `src/lib/sms/sms-provider.interface.ts`
- Providers: `src/lib/sms/sms-providers.ts`
- Service: `src/lib/sms/sms.service.ts`

### Supported Providers
- **Arkesel** - Popular in Africa
- **Hubtel** - Ghana-based SMS provider
- **Twilio** - Global SMS service
- **Termii** - Nigerian SMS platform
- **mNotify** - Ghana-focused SMS provider

### Usage Example

```typescript
import { SMSService } from '@/lib/sms/sms.service';

// Initialize service
const smsService = new SMSService({
  provider: 'arkesel',
  apiKey: process.env.ARKESEL_API_KEY!,
  senderId: 'ZYRAAI',
  isActive: true,
});

// Send single SMS
const result = await smsService.send('+233501234567', 'Hello!');

// Send bulk SMS
const bulkResult = await smsService.sendBulk(
  ['+233501234567', '+233502345678'],
  'Attendance reminder'
);

// Check balance
const balance = await smsService.getBalance();

// Validate credentials
const isValid = await smsService.validateCredentials();
```

### Configuration
Set environment variables in `.env`:
```
ARKESEL_API_KEY=your_api_key
HUBTEL_API_KEY=your_api_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TERMII_API_KEY=your_api_key
MNOTIFY_API_KEY=your_api_key
SMS_SENDER_ID=ZYRAAI
```

### API Endpoint
See: `src/app/api/sms/send/route.ts` for example implementation.

---

## 2. Guards System (RBAC)

### Location
- Permissions: `src/lib/guards/permissions.ts`

### User Roles
- `developer` - System owner (all permissions)
- `super_admin` - Platform administrator
- `admin` - School administrator
- `teacher` - Teaching staff
- `student` - Student user
- `parent` - Parent/Guardian
- `librarian` - Library manager
- `accountant` - Finance officer
- `hr` - Human Resources
- `staff` - General staff
- `reception` - Reception staff

### Server-Side Usage

```typescript
import { requireAdmin, requireStudent, requirePermission } from '@/lib/guards/permissions';

// In API route handlers
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  // Require admin role
  await requireAdmin(user);
  
  // Or require specific permission
  await requirePermission(user, 'manage_students');
}
```

### Permission Checking

```typescript
import { canAccess, hasRole, hasAnyRole } from '@/lib/guards/permissions';

// Non-throwing checks
if (canAccess(user, 'view_reports')) {
  // Allow access
}

if (hasRole(user, 'teacher')) {
  // Show teacher interface
}

if (hasAnyRole(user, ['teacher', 'admin'])) {
  // Show for both teachers and admins
}
```

### Adding Custom Permissions

Edit `ROLE_PERMISSIONS` in `src/lib/guards/permissions.ts`:

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  custom_role: [
    'permission_1',
    'permission_2',
  ],
};
```

---

## 3. Multi-Tenant Middleware

### Location
- Main: `src/middleware.ts`
- Tenant: `src/lib/middleware/tenant-middleware.ts`
- Guards: `src/lib/middleware/guard-middleware.ts`

### How It Works

1. **Subdomain Extraction**: `school-name.zyraai.com` → `school-name`
2. **Tenant Validation**: Checks if tenant exists and is active
3. **Request Routing**: Routes request to correct tenant context
4. **Isolation**: Each tenant's data is isolated and separate

### Configuration

Set up your domain records:
```
*.zyraai.com  A  your.ip.address
```

### Tenant Context

Tenants are identified by:
```
Format: {tenant}.zyraai.com
Example: academy-school.zyraai.com
```

Each tenant gets:
- Isolated database
- Separate user records
- Independent configuration
- Own storage space

### Usage in Routes

```typescript
import { getTenantFromRequest } from '@/lib/middleware/tenant-middleware';

export async function GET(request: NextRequest) {
  const tenantId = getTenantFromRequest(request);
  
  // Use tenantId to fetch tenant-specific data
  const schoolData = await getSchoolData(tenantId);
}
```

---

## 4. Advanced Authentication System

### Location
- Advanced Auth: `src/lib/auth/advanced-auth.ts`

### Features

#### Audit Logger
Logs all important system actions for compliance.

```typescript
import { AuditLogger } from '@/lib/auth/advanced-auth';

// Log user action
await AuditLogger.logAction(
  userId,
  'student.create',
  'student',
  {
    resourceId: studentId,
    ipAddress: '192.168.1.1',
    metadata: { action: 'created new student' },
  }
);

// Log authentication event
await AuditLogger.logAuthEvent(
  userId,
  'login',
  { ipAddress: '192.168.1.1' }
);

// Log data modification
await AuditLogger.logDataModification(
  userId,
  'update',
  'student',
  studentId,
  {
    changes: { name: 'Old Name' } // → 'New Name'
  }
);

// Log security event
await AuditLogger.logSecurityEvent(
  userId,
  'suspicious_access',
  'high',
  { details: 'Multiple failed login attempts' }
);
```

#### Session Manager
Manages user sessions and tokens.

```typescript
import { SessionManager } from '@/lib/auth/advanced-auth';

// Create session
const { sessionId, token } = await SessionManager.createSession(user);

// Validate session
const user = await SessionManager.validateSession(sessionId, token);

// Refresh token
const newToken = await SessionManager.refreshToken(sessionId);

// Invalidate (logout)
await SessionManager.invalidateSession(sessionId);
```

#### Rate Limiter
Prevents brute force attacks.

```typescript
import { RateLimiter } from '@/lib/auth/advanced-auth';

// Check if request allowed
if (RateLimiter.isAllowed(clientIp, 100, 60 * 1000)) {
  // Process request
}

// Get remaining requests
const remaining = RateLimiter.getRemaining(clientIp);

// Reset limit
RateLimiter.reset(clientIp);
```

---

## Integration Checklist

- [ ] Set up SMS provider credentials in `.env`
- [ ] Configure database for audit logs
- [ ] Implement JWT token generation in `SessionManager`
- [ ] Set up Redis/cache for session storage
- [ ] Configure domain and DNS for multi-tenancy
- [ ] Update `.env` with JWT secret
- [ ] Test SMS sending
- [ ] Test permission checks
- [ ] Test tenant isolation
- [ ] Monitor audit logs

---

## Security Best Practices

1. **Always validate tenant access** - Check tenant context in every route
2. **Log security events** - Use AuditLogger for compliance
3. **Rate limit aggressively** - Especially on auth endpoints
4. **Rotate tokens regularly** - Implement token refresh
5. **Monitor audit logs** - Check for suspicious patterns
6. **Use HTTPS only** - Encrypt all data in transit
7. **Validate input** - Always validate request data
8. **Test permissions** - Verify RBAC before production

---

## Troubleshooting

### SMS Not Sending
1. Check API credentials in `.env`
2. Verify SMS balance/credits
3. Check provider status
4. Review audit logs for errors

### Permission Denied
1. Verify user role in database
2. Check custom permissions
3. Review ROLE_PERMISSIONS mapping
4. Check audit logs for access attempts

### Tenant Not Found
1. Verify subdomain is correct
2. Check tenant exists in database
3. Verify tenant is active
4. Check DNS configuration

### Rate Limited
1. Increase rate limit in middleware.ts
2. Check for DDoS attacks in logs
3. Implement IP whitelist if needed
4. Review RateLimiter configuration

---

## Next Steps

1. Integrate with your database
2. Implement proper JWT handling
3. Set up comprehensive audit logging
4. Configure email notifications
5. Implement dashboard for audit logs
6. Add 2FA support
7. Implement device fingerprinting
8. Set up automated backups

