# ZyraAI SYSTEM ARCHITECTURE

## 🏗️ COMPLETE SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ZyraAI EDUCATION OPERATIONS SYSTEM                      │
│                          Architecture Overview                              │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────────────┐
                          │   CLIENT LAYER (Browser) │
                          ├──────────────────────────┤
                          │  React 19 Components    │
                          │  Tailwind CSS Styling   │
                          │  Responsive Design      │
                          └──────────────────────────┘
                                      ▲
                                      │ HTTP/HTTPS
                                      ▼
        ┌───────────────────────────────────────────────────────────┐
        │         NEXT.JS 16 APPLICATION LAYER (SSR/SSG)          │
        ├───────────────────────────────────────────────────────────┤
        │                                                           │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │           API ROUTES (BACKEND)                  │   │
        │  ├──────────────────────────────────────────────────┤   │
        │  │  POST   /api/tenant/setup                       │   │
        │  │  CRUD   /api/tenant/classes                     │   │
        │  │  CRUD   /api/tenant/subjects                    │   │
        │  │  CRUD   /api/tenant/students                    │   │
        │  │  CRUD   /api/tenant/attendance                  │   │
        │  │  CRUD   /api/tenant/assessments                 │   │
        │  │  CRUD   /api/tenant/finance                     │   │
        │  │  CRUD   /api/tenant/hr                          │   │
        │  │  CRUD   /api/tenant/messages                    │   │
        │  └──────────────────────────────────────────────────┘   │
        │                                                           │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │         DASHBOARD PAGES & ROUTES                │   │
        │  ├──────────────────────────────────────────────────┤   │
        │  │  /[tenant]/admin/dashboard                      │   │
        │  │  /[tenant]/student/dashboard                    │   │
        │  │  /[tenant]/parent/dashboard                     │   │
        │  │  /[tenant]/teacher/dashboard                    │   │
        │  │  /[tenant]/finance                              │   │
        │  │  /[tenant]/attendance                           │   │
        │  │  /[tenant]/academics                            │   │
        │  │  /[tenant]/hr                                   │   │
        │  │  /[tenant]/communication                        │   │
        │  │  /[tenant]/student-management                   │   │
        │  │  /[tenant]/settings                             │   │
        │  │  /master/dashboard                              │   │
        │  └──────────────────────────────────────────────────┘   │
        │                                                           │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │    MIDDLEWARE & UTILITIES                       │   │
        │  ├──────────────────────────────────────────────────┤   │
        │  │  ✓ Tenant context extraction                    │   │
        │  │  ✓ RBAC enforcement                             │   │
        │  │  ✓ Input validation (Zod)                       │   │
        │  │  ✓ Error handling                               │   │
        │  │  ✓ API utilities                                │   │
        │  └──────────────────────────────────────────────────┘   │
        │                                                           │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │    UI COMPONENTS & SYSTEM                       │   │
        │  ├──────────────────────────────────────────────────┤   │
        │  │  ✓ Card components (Recharts charts)            │   │
        │  │  ✓ Form components (Inputs, Buttons)            │   │
        │  │  ✓ Table components                             │   │
        │  │  ✓ Modal/Dialog components                      │   │
        │  │  ✓ Status badges & indicators                   │   │
        │  │  ✓ Navigation components                        │   │
        │  └──────────────────────────────────────────────────┘   │
        └───────────────────────────────────────────────────────────┘
                                      ▲
                                      │ SQL Queries (Drizzle ORM)
                                      ▼
        ┌───────────────────────────────────────────────────────────┐
        │         DATABASE LAYER (Drizzle ORM)                     │
        ├───────────────────────────────────────────────────────────┤
        │  ✓ Schema definitions                                   │
        │  ✓ Type-safe queries                                   │
        │  ✓ Migrations support                                  │
        │  ✓ Relationships management                            │
        └───────────────────────────────────────────────────────────┘
                                      ▲
                                      │ PostgreSQL Protocol
                                      ▼
        ┌───────────────────────────────────────────────────────────┐
        │         DATA PERSISTENCE LAYER (PostgreSQL)              │
        ├───────────────────────────────────────────────────────────┤
        │                                                           │
        │  MASTER DATABASE (Platform Level)                       │
        │  ├─ platform_admins                                     │
        │  ├─ schools (Global registry)                           │
        │  ├─ subscription_plans                                  │
        │  ├─ subscriptions                                       │
        │  ├─ invoices (Platform-level)                           │
        │  └─ activity_logs (Global)                              │
        │                                                           │
        │  TENANT DATABASES (Per School)                          │
        │  ├─ Academic Module                                     │
        │  │  ├─ academic_years, classes, subjects               │
        │  │  ├─ curriculum, timetables                           │
        │  │  └─ grade_scales                                     │
        │  │                                                      │
        │  ├─ Student Management                                 │
        │  │  ├─ students, student_documents                     │
        │  │  ├─ admissions, promotions, alumni                  │
        │  │  └─ enrollments                                      │
        │  │                                                      │
        │  ├─ Grading System                                     │
        │  │  ├─ exams, assessments                              │
        │  │  ├─ grades, report_cards                            │
        │  │  └─ performance_analytics                           │
        │  │                                                      │
        │  ├─ Finance Module                                     │
        │  │  ├─ fee_items, invoices                             │
        │  │  ├─ payments, scholarships                          │
        │  │  └─ financial_reports                               │
        │  │                                                      │
        │  ├─ Staff & HR                                         │
        │  │  ├─ staff, departments                              │
        │  │  ├─ payroll, leave_requests                         │
        │  │  └─ attendance (staff)                              │
        │  │                                                      │
        │  ├─ Attendance System                                  │
        │  │  ├─ attendance_records                              │
        │  │  ├─ biometric_enrollment                            │
        │  │  └─ absence_alerts                                  │
        │  │                                                      │
        │  ├─ Communication                                      │
        │  │  ├─ messages, broadcasts                            │
        │  │  ├─ message_templates                               │
        │  │  └─ sms_logs, email_logs                            │
        │  │                                                      │
        │  └─ Authentication & Access                            │
        │     ├─ users, roles, permissions                       │
        │     ├─ sessions                                         │
        │     ├─ accounts                                         │
        │     └─ access_logs                                      │
        │                                                           │
        └───────────────────────────────────────────────────────────┘
```

---

## 🔄 REQUEST/RESPONSE FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW DIAGRAM                         │
└─────────────────────────────────────────────────────────────────┘

  USER (Frontend)
       │
       │ 1. Action triggered (e.g., "Add Student")
       ▼
  NEXT.JS CLIENT
       │
       │ 2. Validate input (Zod schema)
       ▼
  SEND HTTP REQUEST
  Headers:
    - x-school-id
    - x-user-id
    - x-user-role
       │
       ▼
  API ROUTE HANDLER
       │
       │ 3. Extract tenant context
       ▼
  VERIFY PERMISSIONS
       │ (RBAC Check)
       ▼
  VALIDATE INPUT
       │ (Zod parsing)
       ▼
  EXECUTE DATABASE OPERATION
       │ (Drizzle ORM)
       ▼
  POSTGRESQL DATABASE
       │
       │ 4. Store/Retrieve data
       ▼
  RETURN RESULT
       │
       ▼
  API ROUTE
       │
       │ 5. Format response
       ▼
  SEND JSON RESPONSE
       │
       ▼
  NEXT.JS CLIENT
       │
       │ 6. Update UI
       ▼
  USER SEES UPDATE ✅
```

---

## 🔐 SECURITY LAYERS

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: TRANSPORT SECURITY
├─ HTTPS/TLS encryption
├─ Secure cookies
└─ CORS configuration

LAYER 2: AUTHENTICATION
├─ Better Auth
├─ Session management
├─ Device fingerprinting
└─ MFA support

LAYER 3: AUTHORIZATION (RBAC)
├─ Role definitions (10+ roles)
├─ Permission matrix
├─ Tenant isolation
└─ Row-level access control

LAYER 4: INPUT VALIDATION
├─ Zod schema validation
├─ Type checking (TypeScript)
├─ SQL injection prevention (ORM)
└─ XSS protection

LAYER 5: DATA ISOLATION
├─ Tenant header verification
├─ School-based scoping
├─ Database-per-tenant
└─ Query isolation

LAYER 6: LOGGING & MONITORING
├─ Activity logging
├─ Error tracking
├─ Audit trails
└─ Performance monitoring
```

---

## 📊 DATA FLOW BY MODULE

```
STUDENT LIFECYCLE
─────────────────────────────────────────────────────────────

1. ADMISSION
   Entry Form → Validation → Database Store → Email Notification

2. ENROLLMENT
   Applicant Profile → Document Verification → Status Update

3. ACADEMIC JOURNEY
   Classes → Attendance → Assessments → Grades → Reports

4. FINANCE
   Fees Setup → Invoice Generation → Payment Tracking → Reports

5. COMMUNICATION
   System Messages → Parent Notifications → SMS/Email


STAFF WORKFLOW
─────────────────────────────────────────────────────────────

1. RECRUITMENT
   Job Posting → Application → Interview → Offer → Onboarding

2. EMPLOYMENT
   Staff Record → Assignment → Attendance → Performance

3. PAYROLL
   Salary Setup → Monthly Calculation → Allowances → Deductions

4. LEAVE MANAGEMENT
   Request → Approval → Tracking → Reports
```

---

## 🎯 MULTI-TENANT ISOLATION

```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-TENANT ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

PLATFORM LEVEL
└─ Master Database
   ├─ Schools Registry
   ├─ Subscriptions
   ├─ Platform Admins
   └─ Global Settings

SCHOOL LEVEL (TENANT 1)
└─ Tenant Database #1
   ├─ Users (isolated to School 1)
   ├─ Students (School 1 only)
   ├─ Academic Data
   ├─ Finance Records
   └─ All other modules

SCHOOL LEVEL (TENANT 2)
└─ Tenant Database #2
   ├─ Users (isolated to School 2)
   ├─ Students (School 2 only)
   ├─ Academic Data
   ├─ Finance Records
   └─ All other modules

SCHOOL LEVEL (TENANT N)
└─ Tenant Database #N
   └─ ... (same structure)

ISOLATION MECHANISMS
────────────────────
✓ Database-per-tenant isolation
✓ x-school-id header validation
✓ Query scoping with schoolId
✓ Row-level security checks
✓ Separate connection pools
✓ Independent configurations
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                  DEPLOYMENT SETUP                           │
└─────────────────────────────────────────────────────────────┘

DOMAIN STRUCTURE
├─ Main Portal: zyraai.com
├─ Platform Admin: admin.zyraai.com
├─ School 1: academy.zyraai.com
├─ School 2: mountain-peak.zyraai.com
└─ School N: school-name.zyraai.com

APPLICATION SERVERS
├─ Next.js App (Vercel/AWS/Custom)
│  └─ Multiple instances for load balancing
├─ API Gateway (Optional)
│  └─ Rate limiting, caching
└─ WebSocket Server (Socket.io)
   └─ Real-time messaging

DATABASES
├─ Master Database (PostgreSQL - Neon)
│  └─ Schools, subscriptions, platform data
├─ Tenant Databases (PostgreSQL - Per School)
│  └─ Isolated data per school
└─ Cache Layer (Redis - Optional)
   └─ Session cache, query cache

EXTERNAL SERVICES
├─ Email Provider (Resend)
├─ SMS Providers (mNotify, Hubtel, Twilio)
├─ File Storage (S3/Cloudinary)
├─ Payment Gateway (Stripe/Paystack)
└─ Monitoring (Prometheus/Grafana)
```

---

## 🔗 API INTEGRATION POINTS

```
THIRD-PARTY INTEGRATIONS
─────────────────────────────────────────────

EMAIL SERVICE (Resend)
  └─ Broadcast notifications
     ├─ User invitations
     ├─ Fee reminders
     ├─ Grade notifications
     └─ System alerts

SMS GATEWAYS (Multiple Providers)
  └─ Message delivery
     ├─ Absence alerts
     ├─ Fee reminders
     ├─ Emergency notifications
     └─ Broadcast messages

PAYMENT PROCESSING (Stripe/Paystack)
  └─ Fee collection
     ├─ Invoice payment
     ├─ Scholarship disbursement
     ├─ Receipt generation
     └─ Financial reporting

BIOMETRIC SYSTEMS (ZKTeco/Mantra)
  └─ Attendance recording
     ├─ Fingerprint scanning
     ├─ Facial recognition
     ├─ RFID card reading
     └─ Enrollment tracking

FILE STORAGE (S3/Cloudinary)
  └─ Document management
     ├─ Student documents
     ├─ Report cards
     ├─ Certificates
     └─ Branding assets
```

---

## 📈 SYSTEM PERFORMANCE

```
OPTIMIZATION STRATEGIES
───────────────────────────────────────────

DATABASE
├─ Indexed queries (schoolId, userId, date)
├─ Denormalized reports table
├─ Query pagination
└─ Connection pooling

FRONTEND
├─ Code splitting (Next.js)
├─ Image optimization
├─ CSS minification
├─ Bundle optimization
└─ Component lazy loading

CACHING
├─ Browser cache
├─ CDN cache (Static assets)
├─ Database query cache
└─ Session cache (Redis)

MONITORING
├─ Performance metrics
├─ Error tracking
├─ User analytics
└─ System health checks
```

---

## ✅ IMPLEMENTATION COMPLETENESS

```
CORE SYSTEMS: 100% ✅
├─ Authentication ✅
├─ Database ✅
├─ API routes ✅
├─ Dashboards ✅
├─ Security ✅
└─ Documentation ✅

FEATURE MODULES: 95%+ ✅
├─ Student Management ✅
├─ Academics ✅
├─ Attendance ✅
├─ Grading ✅
├─ Finance ✅
├─ HR ✅
├─ Communications ✅
└─ Master Admin ✅

TESTING & DEPLOYMENT: READY ✅
├─ Code quality ✅
├─ Type safety ✅
├─ Documentation ✅
├─ Deployment guide ✅
└─ Support materials ✅
```

---

*System Architecture Last Updated: April 8, 2026*  
*Status: Complete and Ready for Deployment*

