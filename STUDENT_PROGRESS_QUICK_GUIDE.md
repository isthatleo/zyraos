# Student Progress Tracking System - Quick Reference Guide

## 📋 Overview
This is a comprehensive system for tracking student academic progress, managing grades, generating report cards, and monitoring behavioral and attendance records.

## 🚀 Getting Started

### Accessing the System
1. Navigate to `/[tenant]/progress` in your school's admin/teacher dashboard
2. You'll see 4 main tabs:
   - **Academic Overview** - Dashboard with key metrics
   - **Student Progress** - Individual student tracking
   - **Report Cards** - Generate and manage report cards
   - **Grading Scales** - Define grading systems

## 📊 Tab-by-Tab Guide

### 1. Academic Overview
**Purpose**: High-level view of academic performance
- KPI cards showing class averages
- Grade distribution charts
- Overall performance metrics

### 2. Student Progress (Individual Tracking)
**Purpose**: Monitor individual student performance over time

**Steps to Track a Student:**
1. Select **Class/Grade** (Form 1, Form 2, etc.)
2. Select **Student** from the filtered list
3. (Optional) Filter by Term and Academic Year
4. View:
   - **Summary Stats**: Average grade, GPA, rank, attendance
   - **Grades Tab**: All assessments by subject
   - **Progress Notes Tab**: Teacher observations (academic, behavioral, attendance)
   - **Attendance Tab**: Days present vs. total days

### 3. Report Cards
**Purpose**: Create, manage, and distribute professional report cards

#### Generating a Report Card:
1. Click **Generate Report Card** button
2. Fill in form:
   - Student ID
   - Report Type (Termly/Yearly/Final)
   - Comments (Teacher, Principal, Parent)
3. System automatically:
   - Fetches all grades for the period
   - Calculates overall percentage and grade
   - Computes GPA and class rank
   - Includes attendance statistics
4. Report card status is set to **"draft"**

#### Managing Report Cards:
- **Download** - Generate PDF
- **Edit** - Update comments and status
- **Delete** - Remove report card

#### Report Card Statuses:
- `draft` - Initial creation, not yet issued
- `issued` - Officially issued to student
- `sent` - Sent to student/parents
- `printed` - Physical copy printed
- `voided` - Cancelled/not valid

### 4. Grading Scales
**Purpose**: Define how grades are calculated and displayed

#### Creating a Grading Scale:
1. Click **Create Scale** button
2. Configure:
   - **Scale Name** - e.g., "Standard Letter Grades"
   - **Scale Type** - Choose system:
     - Letter Grades (A, B, C, D, F)
     - Percentage (0-100%)
     - GPA Scale (0.0-4.0)
     - Points System
   - **Grade Ranges** - Define score ranges for each grade:
     - Example: 90-100% = A, 80-89% = B, etc.
   - Set as default if this is your primary scale

#### Using Multiple Grading Scales:
- Different subjects can use different scales
- Different grade levels can have different scales
- One scale marked as "default" for new grades

## 🎨 Report Card Builder (Drag & Drop Template)

### Accessing the Builder:
1. Go to `/[tenant]/report-cards` page
2. Click **Report Card Builder** tab

### Designing a Template:
1. **Template Settings** (left panel):
   - Name your template
   - Add description
   - Adjust canvas size (width/height)

2. **Available Elements** (element library):
   - School branding (logo, name)
   - Student info (name, number, class)
   - Academic data (grades table, overall grade, GPA, rank)
   - Comments (teacher, principal, parent)
   - Dates and signatures
   - Custom text and dividers

3. **Drag Elements to Canvas** (middle):
   - Click element in library to add to canvas
   - Drag to position
   - Click to select and edit

4. **Edit Properties** (right panel):
   - Position (X, Y coordinates)
   - Size (width, height)
   - Font size and weight
   - Text alignment
   - Color

5. **Save Template**:
   - Click **Save Template** button
   - Use this template for generating report cards

## 📈 Grade Entry & Tracking

### Adding Grades:
API endpoint: `POST /api/tenant/gradebook`

**Required fields:**
- studentId
- subjectId
- classId
- academicYearId
- assessmentType (exam, test, assignment, project, participation)
- assessmentName
- score
- maxScore
- teacherId

**Optional fields:**
- termId
- grade (auto-calculated if not provided)
- weight (default: 1.0)
- notes
- isExcused

### Grade Calculations:
- **Percentage**: Automatically calculated as (score/maxScore) × 100
- **Letter Grade**: Assigned based on grading scale
- **Weighted Score**: Used when combining multiple assessments
- **Overall Grade**: Average of all subject grades

## 📋 Progress Notes

### Adding Progress Notes:
Can be used to track:
- **Academic**: Classroom performance, homework quality
- **Behavioral**: Conduct, cooperation, discipline
- **Attendance**: Absences, tardiness, patterns

**Note Format:**
- Category: Academic / Behavioral / Attendance
- Note: Observation or comment
- Positive/Negative indicator
- Date automatically recorded

## 🔍 Filtering & Reporting

### Available Filters:
- **Class/Grade**: Form 1, Form 2, Form 3, Form 4
- **Term**: Term 1, Term 2, Term 3
- **Academic Year**: 2024, 2025, 2026
- **Student**: Individual student selection
- **Assessment Type**: Exam, Test, Assignment, Project, Participation

### Data You Can View:
- Individual student progress
- Class-wide statistics
- Subject performance
- Attendance records
- Grade distributions
- Progress trends

## 📊 Key Metrics Explained

### GPA (Grade Point Average)
- Calculated from grading scale's grade points
- Typically ranges 0.0 - 4.0
- Higher is better
- Based on overall grades

### Class Rank
- Student's position within their class
- Calculated from overall percentage
- Example: Rank 5 of 50 students
- Updates when grades change

### Attendance Percentage
- (Days Present / Total Days) × 100
- Tracked across term/academic year
- Affects overall report card assessment

### Overall Grade
- Weighted average of all subject grades
- Converted to letter grade using grading scale
- Shown as both percentage and letter

## 🔐 Access Control

### Teacher View:
- Can see their assigned class students
- Can enter and edit grades
- Can add progress notes
- Can view but not modify report card status

### Admin View:
- Can see all classes and students
- Full access to all features
- Can manage grading scales
- Can approve and issue report cards

### Parent View (if enabled):
- Can view their child's report card
- Can see progress notes marked for parents
- Cannot edit any data

## ⚙️ API Reference Quick Links

**Gradebook**: `/api/tenant/gradebook`
**Report Cards**: `/api/tenant/report-cards`
**Grading Scales**: `/api/tenant/grading-scales`
**Student Progress**: `/api/tenant/students/[id]/progress`

## 🐛 Common Issues & Solutions

**Issue**: Grades not showing up
- **Solution**: Check that academicYearId and termId are set correctly

**Issue**: Report card shows "N/A" for overall grade
- **Solution**: Ensure at least some grades exist for the student in the selected period

**Issue**: Can't generate PDF
- **Solution**: PDF feature will be available in next update

**Issue**: Students not appearing in filter
- **Solution**: Make sure students are enrolled in the selected class

## 📞 Support

For technical issues or feature requests, contact the development team.

---

**Last Updated**: April 2, 2026
**Version**: 1.0.0

