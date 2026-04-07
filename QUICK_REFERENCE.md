# 🚀 ZyraAI Quick Reference Card

## ⚡ Quick Start (Copy & Paste)

```bash
# 1. Initialize database (one time)
npm run init-db

# 2. Start development
npm run dev

# 3. Open browser and visit:
# http://localhost:3000/signup
```

---

## 🎯 Main Routes

```
Home              http://localhost:3000/
Login             http://localhost:3000/login
Signup            http://localhost:3000/signup
User Dashboard    http://localhost:3000/dashboard
Admin Dashboard   http://localhost:3000/admin
```

---

## 👤 Test Accounts

### First User (Super Admin)
```
Email: your@email.com
Password: YourPassword123
Expected: Redirects to /admin
```

### Second User (Regular)
```
Email: user@email.com
Password: UserPassword456
Expected: Redirects to /dashboard
```

---

## 📝 Key Files

```
Authentication
├── lib/auth.ts                 → Better Auth config
├── lib/auth-client.ts          → Client auth setup
└── app/api/auth/               → Auth endpoints

Dashboards
├── app/admin/page.tsx          → Super Admin
├── app/dashboard/page.tsx      → Regular User
└── app/page.tsx                → Home (redirects)

Forms
├── components/login-form.tsx   → Login
├── components/signup-form.tsx  → Signup
└── components/user-profile-button.tsx → Logout

API Routes
├── app/api/check-users/        → Check user count
├── app/api/promote-admin/      → Promote admin
├── app/api/user/check-admin/   → Check role
└── app/api/user/role/          → Get role
```

---

## 🔐 Authentication Flow

```
NEW USER SIGNUP:
Signup Form → Check if First → Yes → Promote to Admin → /admin
                                No → Default User → /dashboard

LOGIN:
Login → Check Credentials → Admin? → Yes → /admin
                          No → /dashboard

HOME PAGE (/):
Visit / → Authenticated? → Yes → Which Role? → /admin or /dashboard
                       No → /login
```

---

## 🎛️ Environment Variables

```bash
DATABASE_URL=postgresql://... # Required
BETTER_AUTH_SECRET="..."      # Required
BETTER_AUTH_URL="http://localhost:3000"  # Required
NEXT_PUBLIC_BASE_URL="http://localhost:3000"  # Required
```

---

## 📊 User Roles

| Role | Access | Dashboard |
|------|--------|-----------|
| `admin` | Super Admin | `/admin` |
| `user` | Regular User | `/dashboard` |

---

## ✅ Build & Deploy

```bash
# Development
npm run dev

# Production Build
npm run build
npm start

# Lint
npm run lint

# Database Init
npm run init-db
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Can't sign up | Run `npm run init-db` |
| Stuck on login | Clear cookies |
| Access denied | Check user role in database |
| Build fails | Delete `.next` folder and rebuild |

---

## 🔗 API Endpoints

```
GET  /api/check-users          → { userCount, hasUsers }
POST /api/promote-admin        → Promote first user
GET  /api/user/check-admin     → { isAdmin }
GET  /api/user/role            → { role }
POST /api/auth/sign-up         → Create account
POST /api/auth/sign-in         → Login
POST /api/auth/sign-out        → Logout
```

---

## 📱 Default Behavior

```
First User Signs Up
 └─ Auto-promoted to admin
 └─ Redirected to /admin

Regular User Signs Up
 └─ Default 'user' role
 └─ Redirected to /dashboard

Admin Logs In
 └─ Checked as admin
 └─ Redirected to /admin

User Logs In
 └─ Regular user access
 └─ Redirected to /dashboard
```

---

## 📚 Documentation

- `README_AUTH.md` - This overview
- `SETUP.md` - Full setup guide
- `AUTH_FLOW.md` - Flow diagrams
- `LAUNCH_CHECKLIST.md` - Pre-launch
- `IMPLEMENTATION_SUMMARY.md` - Technical

---

## 🎓 Validation Rules

**Password**:
- Minimum 8 characters
- Required for signup/login

**Email**:
- Must be valid format (user@domain.com)
- Must be unique in system

**Name** (Signup):
- Required
- Any non-empty string

---

## 🔒 Security

✅ Passwords hashed  
✅ Sessions encrypted  
✅ HTTPS ready  
✅ Input validated  
✅ SQL injection protected  
✅ XSS protected  
✅ HTTP-only cookies  
✅ CSRF protected  

---

## 🚀 Production Checklist

- [ ] Update BETTER_AUTH_SECRET
- [ ] Update BETTER_AUTH_URL
- [ ] Update NEXT_PUBLIC_BASE_URL
- [ ] Enable HTTPS
- [ ] Database SSL enabled
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Error tracking enabled

---

## 📞 Quick Help

**Build doesn't compile?**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Database error?**
```bash
npm run init-db
```

**Clear cookies?**
```
Browser Dev Tools → Application → Cookies → Delete all
```

**Reset everything?**
```bash
rm -rf .next .env
npm run init-db
npm run dev
```

---

## 🎯 Next Steps

1. ✅ Run `npm run init-db`
2. ✅ Run `npm run dev`
3. ✅ Sign up as first user
4. ✅ Access `/admin`
5. ✅ Create second user
6. ✅ Test login flows
7. ✅ Customize dashboards
8. ✅ Deploy to production

---

## 📌 Important Reminders

- **First user is permanent admin** - Can't change after signup
- **Database must be initialized** - Run `npm run init-db` first
- **Only one first user** - After that, all new users are regular
- **Role column required** - Database must have `role` column
- **Sessions are secure** - HTTP-only cookies, can't be stolen via JS

---

**Status**: ✅ Ready to Use  
**Version**: 1.0.0  
**Last Updated**: March 31, 2026

🎉 **Your system is ready! Happy coding!**

