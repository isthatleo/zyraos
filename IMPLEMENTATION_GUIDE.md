# ZyraAI Education Operations System - Implementation Guide

## 📋 Overview

This is a comprehensive, production-grade multi-tenant SaaS education management system built with Next.js 16, Drizzle ORM, Better Auth, and Socket.io.

**Version**: 1.0.0  
**Last Updated**: April 8, 2026  
**Status**: Core Implementation Complete

---

## 🎯 Project Goals

✅ Multi-tenant support with isolated databases per school
✅ 7+ Role-based dashboards (Student, Parent, Teacher, Admin, HR, Finance, Librarian)
✅ Comprehensive Student Information System (SIS)
✅ Academic management (Classes, Subjects, Timetables, Curriculum)
✅ Attendance tracking with biometric integration
✅ Exam & Grading system with report cards
✅ Finance & Billing (Invoices, Payments, Scholarships)
✅ Staff & Payroll Management
✅ Communications (Messaging, Broadcasts, SMS/Email)
✅ Master Admin Control Center

---

## 📁 Project Structure

```
zyraos/
├── app/
│   ├── api/
│   │   ├── tenant/                    # Tenant-specific APIs
│   │   │   ├── setup/route.ts         # School provisioning
│   │   │   ├── classes/route.ts       # Class management
│   │   │   ├── subjects/route.ts      # Subject management
│   │   │   ├── students/route.ts      # Student CRUD
│   │   │   ├── attendance/route.ts    # Attendance tracking
│   │   │   ├── assessments/route.ts   # Exams & grading
│   │   │   ├── finance/route.ts       # Invoices & payments
│   │   │   ├── hr/route.ts            # Staff & payroll
│   │   │   └── messages/route.ts      # Messaging
│   │   └── master/                    # Platform-level APIs
│   ├── [tenant]/
│   │   ├── admin/
│   │   │   └── dashboard/page.tsx
│   │   ├── student/
│   │   │   └── dashboard/page.tsx
│   │   ├── parent/
│   │   │   └── dashboard/page.tsx
│   │   ├── teacher/
│   │   │   └── dashboard/page.tsx
│   │   ├── hr/page.tsx
│   │   ├── finance/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── academics/page.tsx
│   │   ├── communication/page.tsx
│   │   ├── student-management/page.tsx
│   │   └── settings/page.tsx
│   ├── master/
│   │   └── dashboard/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                            # Base components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   └── [Other feature components]
├── lib/
│   ├── db.ts                          # Database client
│   ├── db-schema.ts                   # Drizzle schema
│   ├── validators.ts                  # Zod validation schemas
│   ├── api-utils.ts                   # API utilities
│   ├── auth.ts                        # Better Auth setup
│   └── utils.ts
├── drizzle/
│   ├── migrations/                    # Database migrations
│   └── [migration files]
└── [config files]
```

---

## 🚀 Key Features Implemented

### 1. Multi-Tenant Architecture
- **Database Isolation**: Each school has isolated database with independent data
- **Tenant Resolution**: Via subdomain (e.g., `academy.zyraai.com`)
- **Schema per Tenant**: Dedicated database URL per school
- **Row-level Access Control**: Users only access their school's data

### 2. Authentication & Authorization
- **Better Auth Integration**: Multi-factor auth, session management, device fingerprinting
- **Role-Based Access Control (RBAC)**: 10+ distinct roles with fine-grained permissions
- **Role Types**: 
  - Developer (System Owner)
  - Super Admin (Platform)
  - Admin (School)
  - Staff, HR, Finance, Librarian
  - Teacher/Lecturer
  - Student
  - Parent/Guardian
  - Accountant

### 3. Student Information System (SIS)
- ✅ Student enrollment wizard (6-step process)
- ✅ Student profiles with detailed information
- ✅ Documents management (Birth cert, passport, medical records)
- ✅ Promotion management
- ✅ Alumni portal
- ✅ Bulk import/export functionality

### 4. Academics
- ✅ Class management with capacity tracking
- ✅ Subject management (Core, Elective, Extra)
- ✅ Timetable builder
- ✅ Curriculum management
- ✅ Performance analytics

### 5. Attendance
- ✅ Daily attendance tracking
- ✅ Biometric integration (Fingerprint, Facial, RFID)
- ✅ Absence alerts for parents/teachers
- ✅ Attendance analytics and reports
- ✅ Late tracking and policies

### 6. Exams & Grading
- ✅ Exam scheduling
- ✅ Assessment management (Assignments, Quizzes, Midterms, Finals)
- ✅ Gradebook management
- ✅ Report card generation
- ✅ GPA calculation (Weighted, Simple, Cumulative)
- ✅ Grade scale customization

### 7. Finance & Billing
- ✅ Fee management (Multiple fee types, billing cycles)
- ✅ Invoice generation and tracking
- ✅ Payment processing (Multiple payment methods)
- ✅ Scholarship management
- ✅ Financial reporting and analytics
- ✅ Outstanding fees tracking

### 8. Staff & HR Management
- ✅ Staff directory
- ✅ Payroll processing (Monthly/Term-based)
- ✅ Allowances and deductions
- ✅ Leave request management
- ✅ Staff attendance
- ✅ Performance reviews

### 9. Communications
- ✅ Internal messaging system (Real-time with Socket.io)
- ✅ Broadcast notifications (SMS, Email, In-app)
- ✅ SMS gateway integration (mNotify, Hubtel, Twilio, Termii, Arkesel)
- ✅ Email notifications (Resend)
- ✅ Message templates
- ✅ Broadcast history and analytics

### 10. Master Admin Control Center
- ✅ School registry
- ✅ School provisioning wizard
- ✅ Subscription plan management
- ✅ Billing and invoicing
- ✅ Platform analytics
- ✅ User management
- ✅ System monitoring

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 16 (App Router) |
| **Database** | PostgreSQL (via Neon) |
| **ORM** | Drizzle ORM |
| **Authentication** | Better Auth |
| **Real-time** | Socket.io |
| **UI Framework** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Validation** | Zod |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Forms** | Built-in React forms |
| **Type Safety** | TypeScript |

---

## 🔐 Security Features

- ✅ Row-level security via tenant context
- ✅ Rate limiting on APIs
- ✅ CSRF protection
- ✅ Session management
- ✅ Secure password hashing
- ✅ API key authentication
- ✅ Audit logging (Activity tracking)
- ✅ Data encryption (optional)

---

## 📊 Database Schema

### Core Tables
- `schools` - School information
- `users` - User accounts
- `sessions` - Authentication sessions
- `roles` - Role definitions
- `permissions` - Permission matrix

### Academic Tables
- `academic_years` - Academic year definitions
- `classes` - Class information
- `subjects` - Subject/Course definitions
- `curriculum` - Curriculum mapping
- `timetables` - Class schedules

### Student Tables
- `students` - Student records
- `student_documents` - Document storage
- `admissions` - Admission pipeline
- `promotions` - Class promotions
- `alumni` - Alumni records

### Grading Tables
- `exams` - Exam definitions
- `assessments` - Assessment definitions
- `grades` - Student grades
- `grade_scales` - Grading scales
- `report_cards` - Generated report cards

### Finance Tables
- `fee_items` - Fee definitions
- `invoices` - Invoice records
- `payments` - Payment records
- `scholarships` - Scholarship records
- `subscriptions` - School subscriptions

### HR Tables
- `staff` - Staff records
- `payroll` - Payroll records
- `leave_requests` - Leave applications
- `departments` - Department definitions

### Communication Tables
- `messages` - Direct messages
- `broadcasts` - Mass notifications
- `message_templates` - Message templates
- `sms_logs` - SMS delivery logs

---

## 🔌 API Routes

### Tenant Management
```
POST   /api/tenant/setup                  - Create new school tenant
GET    /api/tenant/setup                  - Get tenant config
```

### Classes
```
POST   /api/tenant/classes                - Create class
GET    /api/tenant/classes                - List classes
PUT    /api/tenant/classes                - Update class
DELETE /api/tenant/classes                - Delete class
```

### Students
```
POST   /api/tenant/students               - Enroll student
GET    /api/tenant/students               - List students
PUT    /api/tenant/students               - Update student
DELETE /api/tenant/students               - Deactivate student
```

### Attendance
```
POST   /api/tenant/attendance             - Record attendance
GET    /api/tenant/attendance             - Get attendance records
PUT    /api/tenant/attendance             - Update attendance
```

### Assessments/Exams
```
POST   /api/tenant/assessments            - Create assessment
GET    /api/tenant/assessments            - List assessments
POST   /api/tenant/assessments (grades)   - Record grades
```

### Finance
```
POST   /api/tenant/finance                - Create invoice/fee
GET    /api/tenant/finance?type=...       - Get financial records
PUT    /api/tenant/finance                - Update record
```

### HR
```
POST   /api/tenant/hr                     - Add staff/payroll
GET    /api/tenant/hr?type=...            - Get HR records
PUT    /api/tenant/hr                     - Update HR records
```

### Messaging
```
POST   /api/tenant/messages               - Send message/broadcast
GET    /api/tenant/messages?type=...      - Get messages
PUT    /api/tenant/messages               - Update message status
```

---

## 🎨 Dashboard Pages

### Admin Dashboard
- **Route**: `/[tenant]/admin/dashboard`
- **Features**: School overview, KPIs, analytics, quick actions

### Student Dashboard
- **Route**: `/[tenant]/student/dashboard`
- **Features**: Grades, attendance, assignments, schedule

### Parent Dashboard
- **Route**: `/[tenant]/parent/dashboard`
- **Features**: Child progress, attendance, fees, communications

### Teacher Dashboard
- **Route**: `/[tenant]/teacher/dashboard`
- **Features**: Classes, grading, attendance marking, performance

### Finance Dashboard
- **Route**: `/[tenant]/finance`
- **Features**: Invoices, collections, reports, fee setup

### Attendance Dashboard
- **Route**: `/[tenant]/attendance`
- **Features**: Daily tracking, biometric, alerts, analytics

### Academics Dashboard
- **Route**: `/[tenant]/academics`
- **Features**: Classes, subjects, timetables, exams, results

### HR Dashboard
- **Route**: `/[tenant]/hr`
- **Features**: Staff directory, payroll, leave management

### Communication Dashboard
- **Route**: `/[tenant]/communication`
- **Features**: Messaging, broadcasts, templates, settings

### Student Management
- **Route**: `/[tenant]/student-management`
- **Features**: SIS, admissions, documents, promotion, alumni

### Settings
- **Route**: `/[tenant]/settings`
- **Features**: School profile, branding, academic settings, finance config

### Master Admin Dashboard
- **Route**: `/master/dashboard`
- **Features**: School registry, subscriptions, billing, analytics

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- npm or bun package manager

### Installation

1. **Clone Repository**
```bash
git clone <repository-url>
cd zyraos
```

2. **Install Dependencies**
```bash
bun install
# or
npm install
```

3. **Setup Environment Variables**
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXT_PUBLIC_API_URL` - API base URL

4. **Setup Database**
```bash
bun run db:push
# or
npm run db:push
```

5. **Start Development Server**
```bash
bun run dev
# or
npm run dev
```

Visit `http://localhost:3000`

---

## 📝 Configuration

### School Creation
```bash
curl -X POST http://localhost:3000/api/tenant/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample School",
    "slug": "sample-school",
    "country": "Ghana",
    "type": "secondary",
    "adminEmail": "admin@sampleschool.com",
    "adminName": "John Doe",
    "subscriptionPlanId": "plan_123"
  }'
```

### User Creation
Uses Better Auth session management - create users through the UI or API

### Tenant Access
- All requests must include tenant headers:
  - `x-school-id`: School identifier
  - `x-user-id`: User identifier
  - `x-user-role`: User role for RBAC

---

## 🔐 Authentication Flow

1. **Portal Selection**: User selects role (Student, Parent, Teacher, etc.)
2. **Login**: Email + Password authentication via Better Auth
3. **Session Creation**: Session token stored in secure cookie
4. **Tenant Assignment**: User's school ID loaded into context
5. **Role Verification**: User's role checked against required permissions
6. **Dashboard Load**: Role-specific dashboard rendered

---

## 📱 Responsive Design

All dashboards are fully responsive:
- **Desktop** (≥1200px): Full layout with sidebar
- **Tablet** (768-1199px): Sidebar collapses to icons, 2-column content
- **Mobile** (<768px): Sidebar hidden, single-column stack, touch-friendly

---

## 🔄 Real-Time Features

### Socket.io Integration
- Real-time messaging updates
- Live attendance updates
- Broadcast notifications
- Grade submissions

Connect to Socket server:
```typescript
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);

// Listen for messages
socket.on('new_message', (data) => {
  // Handle new message
});

// Send message
socket.emit('send_message', {
  recipientId: '123',
  content: 'Hello!'
});
```

---

## 📊 Data Export

All major modules support:
- **Excel Export** (.xlsx)
- **CSV Export** (.csv)
- **PDF Reports** (via browser print)
- **Bulk Import** (Excel template-based)

---

## 🧪 Testing

### API Testing
Use Postman collection or curl:

```bash
# Test student endpoint
curl -X GET http://localhost:3000/api/tenant/students \
  -H "x-school-id: school_123" \
  -H "x-user-id: user_456" \
  -H "x-user-role: admin"
```

### Unit Tests (To be implemented)
```bash
npm run test
```

---

## 🚀 Deployment

### Build
```bash
bun run build
# or
npm run build
```

### Production Start
```bash
bun run start
# or
npm start
```

### Environment for Production
Update `.env.production`:
- Set proper `DATABASE_URL`
- Configure CORS origins
- Enable security headers
- Setup email/SMS providers

---

## 📈 Monitoring & Analytics

- **Prometheus Integration**: Metrics collection
- **Grafana Dashboards**: Visualization
- **Activity Logs**: All user actions tracked
- **Error Tracking**: Centralized error logging

---

## 🔗 SMS/Email Integration

### SMS Providers
- mNotify
- Hubtel
- Twilio
- Termii
- Arkesel

### Email Provider
- Resend (Primary)
- Fallback to SMTP

Configure in settings:
1. Go to `/[tenant]/settings#communication`
2. Add API keys for providers
3. Test connectivity
4. Enable broadcast channels

---

## 📚 API Documentation

Full API documentation available at:
- Postman Collection: `/docs/api.postman_collection.json`
- OpenAPI Spec: `/docs/openapi.yaml`

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Missing Tables
```bash
# Run migrations
bun run db:push
```

### Session Issues
- Clear browser cookies
- Check Better Auth configuration
- Verify session table exists

---

## 📞 Support

For issues or questions:
1. Check documentation
2. Review API logs
3. Check browser console for errors
4. Contact support team

---

## 📄 License

Proprietary - ZyraAI Education Systems

---

## 🎯 Roadmap

### Phase 2 (Planned)
- AI-powered grade predictions
- Advanced reporting with custom filters
- Mobile app (React Native)
- Offline mode support
- Advanced analytics with machine learning
- Integration with external APIs
- Bulk SMS/Email campaigns
- Library management system
- Transport management
- Hostel management

### Phase 3 (Future)
- Video learning platform integration
- Virtual classroom support
- AI tutor assistant
- Parent engagement tools
- Alumni network platform

---

**Last Updated**: April 8, 2026
**Status**: Core features complete, testing phase ongoing
**Next Review**: May 15, 2026

