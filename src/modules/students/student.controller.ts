// Student controller
import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from './student.service';
import { StudentValidators } from './student.validators';
import { CreateStudentData, UpdateStudentData, StudentFilters } from './student.types';
import { requirePermission } from '../../lib/guards/require-permission';
import { requireSchool } from '../../lib/guards/require-school';
import { AuditLogger } from '../../lib/auth/audit-logger';
import { AuditAction } from '../../lib/auth/audit-logger';

export class StudentController {
  private studentService: StudentService;

  constructor() {
    this.studentService = new StudentService();
  }

  // GET /api/students - List students with filters
  async getStudents(request: NextRequest): Promise<NextResponse> {
    try {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check permissions
      const hasPermission = await requirePermission(userId, 'students.read');
      if (!hasPermission.allowed) {
        return NextResponse.json({ error: hasPermission.error }, { status: 403 });
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const filters: StudentFilters = {
        schoolId: searchParams.get('schoolId') || undefined,
        grade: searchParams.get('grade') || undefined,
        status: searchParams.get('status') as any || undefined,
        enrollmentYear: searchParams.get('enrollmentYear') ? parseInt(searchParams.get('enrollmentYear')!) : undefined,
        search: searchParams.get('search') || undefined,
      };

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      const result = await this.studentService.getStudents(filters, page, limit);

      // Audit log
      await AuditLogger.logUserAction(userId, AuditAction.READ, 'students', undefined, { filters, page, limit });

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error getting students:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // GET /api/students/[id] - Get student by ID
  async getStudentById(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate student ID
      if (!StudentValidators.validateStudentId(id)) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
      }

      // Check permissions
      const hasPermission = await requirePermission(userId, 'students.read');
      if (!hasPermission.allowed) {
        return hasPermission.allowed ? NextResponse.json({ error: hasPermission.error }, { status: 403 }) : NextResponse.json({ error: hasPermission.error }, { status: 403 });
      }

      const student = await this.studentService.getStudentById(id);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Check school access for multi-tenant
      const schoolAccess = await requireSchool(userId, student.schoolId);
      if (!schoolAccess.allowed) {
        return NextResponse.json({ error: schoolAccess.error }, { status: 403 });
      }

      // Audit log
      await AuditLogger.logUserAction(userId, AuditAction.READ, 'students', id);

      return NextResponse.json(student);
    } catch (error) {
      console.error('Error getting student:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // POST /api/students - Create new student
  async createStudent(request: NextRequest): Promise<NextResponse> {
    try {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check permissions
      const hasPermission = await requirePermission(userId, 'students.write');
      if (!hasPermission.allowed) {
        return NextResponse.json({ error: hasPermission.error }, { status: 403 });
      }

      const body: CreateStudentData = await request.json();

      // Validate input data
      const validation = StudentValidators.validateCreateData(body);
      if (!validation.isValid) {
        return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
      }

      // Check school access
      const schoolAccess = await requireSchool(userId, body.schoolId);
      if (!schoolAccess.allowed) {
        return NextResponse.json({ error: schoolAccess.error }, { status: 403 });
      }

      // Sanitize data
      const sanitizedData = StudentValidators.sanitizeStudentData(body);

      const student = await this.studentService.createStudent(sanitizedData);

      // Audit log
      await AuditLogger.logUserAction(userId, AuditAction.CREATE, 'students', student.id, { schoolId: body.schoolId });

      return NextResponse.json(student, { status: 201 });
    } catch (error) {
      console.error('Error creating student:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // PUT /api/students/[id] - Update student
  async updateStudent(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate student ID
      if (!StudentValidators.validateStudentId(id)) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
      }

      // Check permissions
      const hasPermission = await requirePermission(userId, 'students.write');
      if (!hasPermission.allowed) {
        return NextResponse.json({ error: hasPermission.error }, { status: 403 });
      }

      const body: UpdateStudentData = await request.json();

      // Validate input data
      const validation = StudentValidators.validateUpdateData(body);
      if (!validation.isValid) {
        return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
      }

      // Check if student exists and get school ID
      const existingStudent = await this.studentService.getStudentById(id);
      if (!existingStudent) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Check school access
      const schoolAccess = await requireSchool(userId, existingStudent.schoolId);
      if (!schoolAccess.allowed) {
        return NextResponse.json({ error: schoolAccess.error }, { status: 403 });
      }

      // Sanitize data
      const sanitizedData = StudentValidators.sanitizeStudentData(body);

      const updatedStudent = await this.studentService.updateStudent(id, sanitizedData);

      // Audit log
      await AuditLogger.logUserAction(userId, AuditAction.UPDATE, 'students', id, { changes: Object.keys(body) });

      return NextResponse.json(updatedStudent);
    } catch (error) {
      console.error('Error updating student:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // DELETE /api/students/[id] - Delete student
  async deleteStudent(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate student ID
      if (!StudentValidators.validateStudentId(id)) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
      }

      // Check permissions
      const hasPermission = await requirePermission(userId, 'students.write');
      if (!hasPermission.allowed) {
        return NextResponse.json({ error: hasPermission.error }, { status: 403 });
      }

      // Check if student exists and get school ID
      const existingStudent = await this.studentService.getStudentById(id);
      if (!existingStudent) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Check school access
      const schoolAccess = await requireSchool(userId, existingStudent.schoolId);
      if (!schoolAccess.allowed) {
        return NextResponse.json({ error: schoolAccess.error }, { status: 403 });
      }

      await this.studentService.deleteStudent(id);

      // Audit log
      await AuditLogger.logUserAction(userId, AuditAction.DELETE, 'students', id, { schoolId: existingStudent.schoolId });

      return NextResponse.json({ message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Error deleting student:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // GET /api/students/stats - Get student statistics
  async getStudentStats(request: NextRequest): Promise<NextResponse> {
    try {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check permissions
      const hasPermission = await requirePermission(userId, 'students.read');
      if (!hasPermission.allowed) {
        return NextResponse.json({ error: hasPermission.error }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const schoolId = searchParams.get('schoolId');

      if (schoolId) {
        // Check school access
        const schoolAccess = await requireSchool(userId, schoolId);
        if (!schoolAccess.allowed) {
          return NextResponse.json({ error: schoolAccess.error }, { status: 403 });
        }
      }

      const stats = await this.studentService.getStudentStats(schoolId || undefined);

      return NextResponse.json(stats);
    } catch (error) {
      console.error('Error getting student stats:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
}
