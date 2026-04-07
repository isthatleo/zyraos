# ZyraAI Auth Flow & Admin Dashboard - Quick Reference

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Visit Home (/)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
        ✓ Authenticated         ✗ Not Authenticated
                │                     │
        ┌───────┴────────┐            ▼
        │                │      Redirect to /login
        ▼                ▼
    Check Role    Login Form
        │          │
    ┌───┴───┐     │ Submit Credentials
    │       │     │
    │ Admin │     ▼
    │       │  Verify Email/Password
    └───┬───┘     │
        │         ├─ Invalid → Show Error
        │         │
        │         └─ Valid → Create Session
        │              │
        │              ▼
        │          Check User Role
        │              │
        ├──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   /admin        /dashboard      /dashboard
 (Super Admin)    (Regular)      (Regular)
```

## First User Registration Flow

```
User visits /signup
         │
         ▼
   Sign Up Form
   (Name, Email, Password)
         │
         ▼
   Validate Input
   (Email format, Password ≥8 chars)
         │
   ┌─────┴─────┐
   │           │
   ✓           ✗ → Show Error
   │
   ▼
Create Account (via Better Auth)
   │
   ▼
Check User Count
   │
   ├─ Count = 1 (First User!)
   │   │
   │   ▼
   │ Promote to Admin Role
   │   │
   │   ▼
   │ Show Success Toast
   │ "🎉 You are now Super Admin!"
   │   │
   │   └──────┐
   │          │
   └──────────┼─────────────────┐
              │                 │
              ▼                 ▼
         /admin            /dashboard
      (Super Admin)      (Regular User)
```

## Login Flow with Role Check

```
User visits /login
     │
     ▼
 Sign In Form
     │
     ▼
Submit Credentials
     │
     ├─ Invalid → Show Error & Stay on /login
     │
     ▼
✓ Valid Credentials
     │
     ▼
Get Session Established
     │
     ▼
Fetch /api/user/check-admin
     │
   ┌─┴─┐
   │   │
   ✓   ✗
   │   │
   ▼   ▼
 Admin Regular
   │    │
   ▼    ▼
/admin /dashboard
 +msg  +msg
"Welcome"  "Signed in"
```

## Super Admin Dashboard Features

**URL**: `/admin`

**Access Requirements**:
- Must be authenticated (have session)
- Must have `role = 'admin'` in database

**Features Available**:
1. 👥 **User Management** - Manage all system users
2. ⚙️ **System Settings** - Configure system preferences
3. 📊 **Reports & Analytics** - View system reports
4. 📋 **Audit Logs** - Monitor system activity
5. 🗄️ **Database Management** - Manage database
6. 📖 **Documentation** - Access system docs

**Information Displayed**:
- Current user name and email
- System status
- User role (Super Admin)
- System version
- Environment (Production/Development)

## Role-Based Access Control

| Route | Anonymous | User | Admin |
|-------|-----------|------|-------|
| `/` | ✓ (redirects) | ✓ (redirects) | ✓ (redirects) |
| `/login` | ✓ | ✗ (redirects) | ✗ (redirects) |
| `/signup` | ✓ | ✗ (redirects) | ✗ (redirects) |
| `/dashboard` | ✗ (redirect) | ✓ | ✓ |
| `/admin` | ✗ (redirect) | ✗ (access denied) | ✓ |

## Key API Endpoints for Authentication

### Session Management
```
GET /api/auth/get-session
- Returns: { user, session } or null
- Use: Check if user is authenticated
```

### Role Checking
```
GET /api/user/check-admin
- Returns: { isAdmin: boolean }
- Use: Determine which dashboard to show
```

```
GET /api/user/role
- Returns: { role: string, isAdmin: boolean }
- Use: Get user's specific role
```

### User Statistics
```
GET /api/check-users
- Returns: { hasUsers: boolean, userCount: number }
- Use: Check if first user is being created
```

## Database User Roles

| Role | Description | Automatic | Promotion |
|------|-------------|-----------|-----------|
| `admin` | Super Admin - Full system access | ✓ First user only | Manual (N/A) |
| `user` | Standard user - Default role | ✓ All after first | Not yet implemented |

## Security Notes

✅ **Implemented**:
- Password minimum 8 characters
- Email format validation
- Session-based authentication
- HTTP-only cookies
- HTTPS-ready configuration
- Server-side role verification
- Automatic admin for first user

⚠️ **To Implement**:
- Email verification flow
- Password reset functionality
- Two-factor authentication (2FA)
- Rate limiting on auth endpoints
- Audit logging for admin actions
- OAuth provider configuration (Google, etc.)

## Troubleshooting

### "Access denied: Admin privileges required"
**Problem**: You tried accessing `/admin` but don't have admin role
**Solution**: 
- Check if you're the first user (should auto-promote)
- Run `SELECT role FROM user WHERE email='your@email.com'` in database
- Manually update if needed: `UPDATE user SET role='admin' WHERE id='user-id'`

### Stuck on login redirect
**Problem**: Login redirects back to `/login` infinitely
**Solution**:
- Clear browser cookies
- Check `/api/auth/get-session` returns valid session
- Verify `BETTER_AUTH_SECRET` is set correctly

### Can't sign up first user
**Problem**: Signup form doesn't work for first user
**Solution**:
- Ensure database has `role` column (run `npm run init-db`)
- Check `/api/check-users` endpoint works
- Verify `/api/promote-admin` is accessible

---

**Last Updated**: March 31, 2026  
**System**: ZyraAI Education Operations System v1.0.0

