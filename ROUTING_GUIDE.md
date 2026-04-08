/**
 * Complete Routing & Navigation Guide
 * Path: ROUTING_GUIDE.md
 */

# 🗺️ ZyraAI Complete Routing & Navigation Guide

## Overview

This guide provides a complete map of all routes, navigation structures, and access paths in the ZyraAI Education Operations System.

---

## 📱 Route Structure

### Root Routes

```
/                          - Landing page
/login                     - Authentication portal
/access-denied            - Access denied page
```

### Admin Portal Routes

```
/admin/
├── dashboard/            - Main admin dashboard
├── classes/              - Class management
├── academics/            - Academic settings
├── sis/                  - Student Information System
│   ├── profiles/         - Student profiles
│   ├── admissions/       - Admissions management
│   ├── documents/        - Document management
│   ├── promotions/       - Student promotions
│   └── alumni/           - Alumni records
├── attendance/           - Attendance tracking
├── exams/                - Exam management
├── library/              - Library management
├── finance/
│   ├── dashboard/        - Finance overview
│   ├── finance/          - Finance management
│   └── billing/          - Billing records
├── communication/
│   ├── broadcasts/       - SMS/Email broadcasts
│   └── sms-reports/      - SMS delivery reports
├── users/                - User management
├── permissions/          - Permission management
├── settings/             - Global settings
└── audit-logs/           - Activity logs
```

### Teacher Portal Routes

```
/teacher/
├── dashboard/            - Teaching dashboard
├── classes/
│   ├── (default)        - My classes list
│   ├── lesson-plans/    - Lesson planning
│   ├── learning-content/ - Learning materials
│   └── class-insights/   - Performance analytics
├── schedule/             - My schedule
├── grading/              - Grading interface
├── attendance/           - Attendance marking
├── exams/                - Exam management
├── messaging/            - Parent messaging
└── profile/              - Profile management
```

### Parent Portal Routes

```
/parent/
├── dashboard/            - Parent dashboard
├── children/             - Children management
│   └── [childId]/       - Individual child profile
├── attendance/           - Attendance tracking
├── fees/                 - Fee management
│   ├── payments/        - Payment history
│   └── invoices/        - Invoice view
└── communication/        - School communication
```

### Student Portal Routes

```
/student/
├── dashboard/            - Student dashboard
├── academics/
│   ├── subjects/        - Enrolled subjects
│   ├── results/         - Grade history
│   ├── assignments/     - Assignment list
│   └── resources/       - Learning materials
├── schedule/             - Class schedule
│   └── attendance/       - Attendance history
├── performance/          - Performance tracking
├── finance/              - Fee status
└── messages/             - Communication
```

### API Routes

```
/api/
├── admin/
│   ├── users/           - User management
│   ├── permissions/     - Permission management
│   ├── finance/         - Finance endpoints
│   ├── sms/             - SMS operations
│   └── audit-logs/      - Activity logs
├── teacher/
│   ├── attendance/      - Attendance endpoints
│   ├── grades/          - Grading endpoints
│   └── assignments/     - Assignment endpoints
├── parent/
│   ├── children/        - Child endpoints
│   ├── fees/            - Fee endpoints
│   └── communication/   - Messaging endpoints
├── student/
│   ├── dashboard/       - Dashboard data
│   ├── grades/          - Grade endpoints
│   ├── schedule/        - Schedule endpoints
│   └── assignments/     - Assignment endpoints
└── messaging/
    ├── send/            - Send message
    ├── broadcast/       - Broadcast message
    │   ├── sms/        - SMS broadcast
    │   └── email/      - Email broadcast
    └── settings/        - Communication settings
```

---

## 🧭 Navigation Flows

### Admin Dashboard Flow

```
Admin Login
    ↓
Admin Dashboard
├── School Operations
│   ├── Dashboard → School metrics overview
│   ├── Classes → Class management
│   ├── Academics → Subject/curriculum setup
│   ├── SIS → Student records
│   │   ├── Profiles → Student directory
│   │   ├── Admissions → Application pipeline
│   │   ├── Documents → Document storage
│   │   ├── Promotions → Grade transitions
│   │   └── Alumni → Alumni records
│   ├── Attendance → Attendance overview
│   ├── Exams → Exam management
│   └── Library → Library management
├── Finance
│   ├── Dashboard → Revenue metrics
│   ├── Finance → Transaction history
│   └── Billing → Invoice management
├── Communication
│   ├── Broadcasts → SMS/Email sending
│   └── SMS Reports → Delivery tracking
├── User Management
│   ├── Users → User directory
│   └── Permissions → Role-based access
├── System
│   ├── Settings → School configuration
│   └── Audit & Logs → Activity tracking
└── Logout
```

### Teacher Dashboard Flow

```
Teacher Login
    ↓
Teacher Dashboard
├── Classes
│   ├── My Classes → Class list
│   ├── Lesson Plans → Curriculum mapping
│   ├── Learning Content → Resource uploads
│   └── Class Insights → Performance data
├── Schedule → Timetable view
├── Grading → Assignment grading
├── Attendance → Mark attendance
├── Exams → Results entry
├── Messaging → Parent communication
├── Profile → Personal settings
└── Logout
```

### Parent Dashboard Flow

```
Parent Login
    ↓
Parent Dashboard
├── My Children
│   └── [Child Name]
│       ├── Academic overview
│       ├── Grade tracking
│       └── Progress insights
├── Attendance
│   ├── Attendance history
│   └── Attendance alerts
├── Fees & Payments
│   ├── Outstanding balance
│   ├── Payment history
│   └── Invoice download
├── Communication
│   ├── Message teacher
│   ├── View announcements
│   └── Contact school
└── Logout
```

### Student Dashboard Flow

```
Student Login
    ↓
Student Dashboard
├── Academics
│   ├── Subjects → Course materials
│   ├── Results → Grade history
│   ├── Assignments → Task list
│   └── Resources → Learning materials
├── Schedule & Attendance
│   ├── Schedule → Timetable
│   └── Attendance → Attendance record
├── Performance
│   ├── Overall GPA
│   ├── Subject performance
│   └── Growth insights
├── Finance
│   ├── Fee status
│   ├── Payment history
│   └── Outstanding balance
├── Messages → Communication
└── Logout
```

---

## 🔐 Access Control Matrix

### Role Access by Module

| Module | Admin | Teacher | Parent | Student |
|--------|-------|---------|--------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Classes | ✅ | ✅ | ❌ | ❌ |
| Academics | ✅ | ✅ | ❌ | ✅ |
| SIS | ✅ | ✅ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ✅ |
| Exams | ✅ | ✅ | ❌ | ✅ |
| Finance | ✅ | ❌ | ✅ | ✅ |
| Communication | ✅ | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ | ❌ |
| Permissions | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| Audit & Logs | ✅ | ❌ | ❌ | ❌ |

---

## 🔗 Deep Linking Examples

### Admin
```
/admin/dashboard                    - Main admin dashboard
/admin/users?role=teacher           - Filter teachers
/admin/users?search=John            - Search users
/admin/permissions?role=teacher     - Teacher permissions
/admin/finance/dashboard            - Finance overview
/admin/communication/broadcasts     - Create broadcast
/admin/communication/sms-reports    - View SMS metrics
/admin/audit-logs?filter=success    - Filter successful actions
/admin/audit-logs?search=user.create - Search specific actions
```

### Teacher
```
/teacher/dashboard                  - Main dashboard
/teacher/classes                    - My classes
/teacher/classes/lesson-plans       - Lesson planning
/teacher/attendance                 - Mark attendance
/teacher/attendance?date=2024-03-15 - Specific date
/teacher/grading                    - Grading interface
/teacher/grading?class=JHS1         - Specific class
/teacher/messaging                  - Parent messages
```

### Parent
```
/parent/dashboard                   - Main dashboard
/parent/children                    - My children
/parent/children/STU001             - Specific child
/parent/attendance                  - Attendance view
/parent/fees                        - Fee status
/parent/fees/invoices               - Invoice list
/parent/communication               - Message school
```

### Student
```
/student/dashboard                  - Main dashboard
/student/academics/subjects         - My subjects
/student/academics/results          - Grade history
/student/academics/assignments      - Assignment list
/student/performance                - Performance analytics
/student/schedule                   - My timetable
/student/finance                    - Fee status
/student/messages                   - Messages
```

---

## 🎯 Query Parameters

### Common Query Parameters

```
?role=teacher                       - Filter by role
?status=active                      - Filter by status
?search=John                        - Search query
?page=2                             - Pagination
?sort=date                          - Sort field
?order=asc                          - Sort order (asc/desc)
?date=2024-03-15                    - Filter by date
?from=2024-01-01&to=2024-03-31     - Date range
?filter=success                     - Custom filter
```

### Page-Specific Parameters

```
/admin/users?role=teacher&status=active
/admin/permissions?role=admin
/admin/audit-logs?action=user.create&status=success
/teacher/grading?class=JHS1&assignment=123
/parent/children/STU001?tab=academics
/student/academic/results?subject=Mathematics
```

---

## 📍 Sidebar Navigation Items

### Admin Sidebar (Collapsible)
- Dashboard (linked)
- Classes (linked)
- Academics (linked)
- SIS ⤵️ (expandable)
  - Student Profiles
  - Admissions
  - Documents
  - Promotions
  - Alumni
- Attendance (linked)
- Exams (linked)
- Library (linked)
- Finance Section Header
- Dashboard (linked)
- Finance (linked)
- Billing (linked)
- Communication Section Header
- Messaging & Broadcasts (linked)
- SMS Reports (linked)
- User Management Section Header
- Users (linked)
- Permissions (linked)
- System Section Header
- Settings (linked)
- Audit & Logs (linked)

### Teacher Sidebar (Collapsible)
- Dashboard (linked)
- Classes ⤵️ (expandable)
  - My Classes
  - Lesson Plans
  - Learning Content
  - Class Insights
- My Schedule (linked)
- Grading & Tasks (linked)
- Attendance (linked)
- Exams (linked)
- Messaging (linked)
- My Profile (linked)

### Parent Sidebar (Simple)
- Dashboard (linked)
- My Children (linked)
- Attendance (linked)
- Fees & Payments (linked)
- Communication (linked)

### Student Sidebar (Collapsible)
- My Dashboard (linked)
- Academics ⤵️ (expandable)
  - My Subjects
  - Exams & Results
  - Assignments
  - Learning Resources
- Schedule & Attendance (linked)
- Performance (linked)
- Fees & Finance (linked)
- Communication (linked)

---

## 🔗 Breadcrumb Navigation

### Examples

```
Admin > Dashboard
Admin > User Management > Users
Admin > User Management > Permissions
Admin > Finance > Dashboard
Admin > Communication > SMS Reports
Admin > System > Audit & Logs

Teacher > Dashboard
Teacher > Classes > My Classes
Teacher > Grading > Assignment Name
Teacher > Attendance > Mark Attendance

Parent > Dashboard
Parent > Children > Child Name
Parent > Fees > Payment History

Student > Dashboard
Student > Academics > Subjects
Student > Performance > Grade History
```

---

## ⚡ Active Route Highlighting

### Navigation Item States

```
Current Route:    /admin/dashboard
Active Item:      Dashboard (highlighted in blue)
Active Section:   School Operations

Current Route:    /admin/communication/broadcasts
Active Item:      Messaging & Broadcasts (highlighted)
Active Section:   Communication

Current Route:    /teacher/grading
Active Item:      Grading & Tasks (highlighted)
Active Section:   Operations
```

---

## 🔀 Route Transitions

### Page Transitions
```
Login Page
    ↓ (Authenticate)
Portal Selection
    ↓ (Select role)
Role Dashboard
    ↓ (Navigate)
Specific Feature Page
    ↓ (Click action)
Detail/Edit Page
```

### Modal Transitions
```
Page
    ↓ (Click "Add User")
Modal Opens (overlays page)
    ↓ (Fill form)
    ↓ (Click save)
API Call
    ↓ (Success)
Modal closes → Page updates
```

---

## 🛡️ Protected Routes

All authenticated routes require:
1. Valid JWT token in session
2. User role matching required access level
3. Module permission for the specific route

### Route Protection Example

```typescript
// /admin/users requires:
- isAuthenticated: true
- userRole: 'admin' || 'superadmin'
- permission: 'User Management'

// /parent/fees requires:
- isAuthenticated: true
- userRole: 'parent'
- relationship verified (parent of student)

// /student/academics/results requires:
- isAuthenticated: true
- userRole: 'student'
- enrollmentStatus: 'active'
```

---

## 📲 Responsive Navigation

### Desktop (>1024px)
- Full sidebar always visible
- Main content takes remaining space
- All navigation items visible

### Tablet (768px-1024px)
- Sidebar icons only (collapsible)
- Main content adjusted
- Mobile menu on top for extra items

### Mobile (<768px)
- Hamburger menu sidebar
- Full-screen when opened
- Bottom navigation for quick access

---

## 🎯 Navigation Best Practices

1. **Clear Hierarchy** - Parent items group related features
2. **Active State** - Current page clearly highlighted
3. **Breadcrumbs** - Show path to current page
4. **Back Button** - Available on detail pages
5. **Quick Links** - Dashboard quick action buttons
6. **Search** - Available in user management pages
7. **Filters** - Available in list pages
8. **Pagination** - For large data sets

---

## 📋 Routing Summary

**Total Routes: 50+**
- Admin Routes: 20+
- Teacher Routes: 12+
- Parent Routes: 6+
- Student Routes: 8+
- Special Routes: 4+

**All routes are fully implemented and ready for navigation!** ✅


