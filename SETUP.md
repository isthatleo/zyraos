# ZyraAI Education Operations System - Getting Started Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Neon DB recommended)
- Environment variables configured

### 1. Environment Setup

Create a `.env` file in the project root with:

```env
DATABASE_URL=postgresql://... # Your Neon database connection string
BETTER_AUTH_SECRET="your-secret-key" # Use a strong random secret for production
BETTER_AUTH_URL="http://localhost:3000" # Change to your production URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # Public URL for the app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Database

Run the database initialization script to set up the role column:

```bash
npm run init-db
```

This will:
- Add the `role` column to the `user` table
- Create an index for faster queries
- Check existing users

### 4. Run the Application

**Development:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

**Production Build:**
```bash
npm run build
npm start
```

## 👤 User Authentication Flow

### First User Registration (Super Admin)

1. Navigate to `http://localhost:3000/signup`
2. Fill in your details (Name, Email, Password)
3. Submit the form
4. **The first user is automatically promoted to Super Admin**
5. You'll be redirected to `/admin` dashboard

### Subsequent User Registration

1. New users sign up through the same signup page
2. They are created with the default **user** role
3. They are redirected to `/dashboard` (standard user dashboard)

### Login

1. Navigate to `http://localhost:3000/login`
2. Enter your credentials
3. If you're an admin → redirect to `/admin`
4. If you're a regular user → redirect to `/dashboard`

## 🎯 Key Features

### Super Admin Dashboard (`/admin`)
- Accessed only by users with `admin` role
- Shows system overview and admin features
- Full access to:
  - User Management
  - System Settings
  - Reports & Analytics
  - Audit Logs
  - Database Management
  - Documentation

### User Dashboard (`/dashboard`)
- Standard user interface
- Education operations management
- Personal data and activities

### Home Page (`/`)
- Automatically redirects authenticated users to their appropriate dashboard
- Redirects unauthenticated users to `/login`

## 🔑 API Endpoints

### Authentication
- **POST** `/api/auth/sign-up` - Register new user
- **POST** `/api/auth/sign-in` - Login
- **POST** `/api/auth/sign-out` - Logout
- **GET** `/api/auth/get-session` - Get current session

### User Management
- **GET** `/api/check-users` - Check total user count
- **POST** `/api/promote-admin` - Promote first user to admin (only works if ≤ 1 user)
- **GET** `/api/user/role` - Get current user's role
- **GET** `/api/user/check-admin` - Check if user is admin

## 📝 User Roles

### Super Admin (`admin`)
- Full system access
- Can manage all users
- Can access admin dashboard
- First user created automatically gets this role

### User (`user`)
- Standard access
- Can access user dashboard
- Limited to their own data

## 🔒 Route Protection

Routes are protected via:
1. **Next.js Middleware** - Checks session cookie
2. **API Endpoints** - Verify session server-side
3. **Component-level** - Client-side checks redirect unauthorized access

Protected Routes:
- `/dashboard` - Requires authentication
- `/admin` - Requires `admin` role
- `/api/*` - Most endpoints require authentication

Public Routes:
- `/` - Redirects based on auth status
- `/login` - No auth required
- `/signup` - No auth required

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run init-db      # Initialize database schema
```

### Project Structure

```
zyraos/
├── app/
│   ├── admin/              # Super Admin dashboard
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication routes
│   │   ├── check-users/    # User count check
│   │   ├── promote-admin/  # Admin promotion
│   │   └── user/           # User info endpoints
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (auth redirect)
├── components/
│   ├── login-form.tsx      # Login form component
│   ├── signup-form.tsx     # Signup form component
│   ├── user-profile-button.tsx # User info & logout
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── auth.ts             # Better Auth configuration
│   ├── auth-client.ts      # Client-side auth
│   ├── db.ts               # Database connection
│   └── role-utils.ts       # Role checking utilities
├── middleware.ts           # Route protection middleware
└── SETUP.md               # This file
```

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use strong, random secrets for `BETTER_AUTH_SECRET`
   - Keep `DATABASE_URL` confidential

2. **Authentication**
   - Passwords must be at least 8 characters
   - Email validation is enforced
   - Session cookies are secure and httpOnly

3. **Admin Access**
   - First user is automatically admin
   - Additional admins must be promoted manually
   - Admin endpoints verify role server-side

4. **Database**
   - Use SSL connections (Neon provides this)
   - Regular backups recommended
   - Connection pooling enabled by default

## 🆘 Troubleshooting

### Build Issues

**Error: Tooltip must be used within TooltipProvider**
- Fixed in dashboard page, ensure TooltipProvider wraps all components

**Error: Expected 2 arguments but got 1**
- Related to drizzleAdapter, should be: `drizzleAdapter(db, { provider: "pg" })`

### Database Issues

**Error: Column "role" does not exist**
- Run `npm run init-db` to initialize the schema

**Error: Connection refused**
- Verify DATABASE_URL is correct
- Check Neon database is running
- Ensure network access is allowed

### Authentication Issues

**Stuck on loading screen**
- Clear browser cookies
- Check browser console for errors
- Verify auth API route is accessible

**Admin dashboard shows access denied**
- Verify user has `admin` role in database
- Check `/api/user/check-admin` endpoint returns `isAdmin: true`

## 📚 Additional Resources

- [Better Auth Documentation](https://better-auth.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Neon Database](https://neon.tech)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

## 🎓 Next Steps

1. Complete the initial setup above
2. Create your first Super Admin account
3. Customize the admin dashboard for your needs
4. Add additional users with appropriate roles
5. Configure OAuth providers (Google, etc.) if needed
6. Set up email notifications and alerts
7. Deploy to production

---

**System**: ZyraAI Education Operations System v1.0.0  
**Last Updated**: March 31, 2026


