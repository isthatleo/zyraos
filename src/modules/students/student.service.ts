// Student service
import { StudentRepository } from './student.repository';
import { NotificationService } from '../../services/notification.service';
import { AuditLogger } from '../../lib/auth/audit-logger';
import { AuditAction } from '../../lib/auth/audit-logger';
import {
  Student,
  CreateStudentData,
  UpdateStudentData,
  StudentFilters,
  StudentStats,
  StudentWithDetails
} from './student.types';

export class StudentService {
  private repository: StudentRepository;
  private notificationService?: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.repository = new StudentRepository();
    this.notificationService = notificationService;
  }

  // Create student
  async createStudent(data: CreateStudentData): Promise<Student> {
    // Check if user already has a student record
    const existingStudent = await this.repository.findByUserId(data.userId);
    if (existingStudent) {
      throw new Error('User already has a student record');
    }

    // Check if email is already taken
    const emailExists = await this.repository.existsByEmail(data.email);
    if (emailExists) {
      throw new Error('Email already exists');
    }

    const student = await this.repository.create(data);

    // Send welcome notification
    if (this.notificationService && data.phone) {
      await this.notificationService.sendNotification({
        type: 'both',
        email: data.email,
        phone: data.phone,
        template: 'welcome',
        data: {
          name: `${data.firstName} ${data.lastName}`,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        },
      });
    }

    // Audit log
    await AuditLogger.logSystemAction(AuditAction.CREATE, 'students', student.id, {
      schoolId: data.schoolId,
      userId: data.userId,
    });

    return student;
  }

  // Get student by ID
  async getStudentById(id: string): Promise<Student | null> {
    return await this.repository.findById(id);
  }

  // Get student by user ID
  async getStudentByUserId(userId: string): Promise<Student | null> {
    return await this.repository.findByUserId(userId);
  }

  // Get student with full details
  async getStudentWithDetails(id: string): Promise<StudentWithDetails | null> {
    const student = await this.repository.findById(id);
    if (!student) return null;

    // In a real implementation, you would fetch related data:
    // - School information
    // - Parent information
    // - Grades
    // - Attendance

    return {
      ...student,
      school: undefined, // Would fetch from schools table
      parents: [], // Would fetch from parent_students table
      grades: [], // Would fetch from grades table
      attendance: undefined, // Would calculate from attendance table
    };
  }

  // Get students with filters and pagination
  async getStudents(
    filters: StudentFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ students: Student[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await this.repository.findMany(filters, page, limit);
    const totalPages = Math.ceil(result.total / limit);

    return {
      ...result,
      totalPages,
    };
  }

  // Update student
  async updateStudent(id: string, data: UpdateStudentData): Promise<Student | null> {
    // Check if email change would conflict
    if (data.email) {
      const emailExists = await this.repository.existsByEmail(data.email, id);
      if (emailExists) {
        throw new Error('Email already exists');
      }
    }

    const updatedStudent = await this.repository.update(id, data);

    if (updatedStudent) {
      // Audit log
      await AuditLogger.logSystemAction(AuditAction.UPDATE, 'students', id, {
        changes: Object.keys(data),
      });
    }

    return updatedStudent;
  }

  // Delete student
  async deleteStudent(id: string): Promise<boolean> {
    const student = await this.repository.findById(id);
    if (!student) {
      return false;
    }

    const deleted = await this.repository.delete(id);

    if (deleted) {
      // Audit log
      await AuditLogger.logSystemAction(AuditAction.DELETE, 'students', id, {
        schoolId: student.schoolId,
        userId: student.userId,
      });
    }

    return deleted;
  }

  // Get students by school
  async getStudentsBySchool(schoolId: string): Promise<Student[]> {
    return await this.repository.findBySchool(schoolId);
  }

  // Get students by grade
  async getStudentsByGrade(grade: string, schoolId?: string): Promise<Student[]> {
    return await this.repository.findByGrade(grade, schoolId);
  }

  // Get student statistics
  async getStudentStats(schoolId?: string): Promise<StudentStats> {
    return await this.repository.getStats(schoolId);
  }

  // Bulk operations
  async bulkCreateStudents(data: CreateStudentData[]): Promise<Student[]> {
    // Validate all data first
    const errors: string[] = [];
    for (let i = 0; i < data.length; i++) {
      // Basic validation - check required fields
      const item = data[i];
      if (!item.userId || !item.schoolId || !item.firstName || !item.lastName || !item.email) {
        errors.push(`Item ${i + 1}: Missing required fields`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const students = await this.repository.bulkCreate(data);

    // Audit log
    await AuditLogger.logSystemAction(AuditAction.CREATE, 'students', undefined, {
      bulkCreate: true,
      count: students.length,
    });

    return students;
  }

  async bulkUpdateStudents(updates: Array<{ id: string; data: UpdateStudentData }>): Promise<Student[]> {
    const students = await this.repository.bulkUpdate(updates);

    // Audit log
    await AuditLogger.logSystemAction(AuditAction.UPDATE, 'students', undefined, {
      bulkUpdate: true,
      count: students.length,
    });

    return students;
  }

  async bulkDeleteStudents(ids: string[]): Promise<number> {
    const deletedCount = await this.repository.bulkDelete(ids);

    // Audit log
    await AuditLogger.logSystemAction(AuditAction.DELETE, 'students', undefined, {
      bulkDelete: true,
      count: deletedCount,
    });

    return deletedCount;
  }

  // Search students
  async searchStudents(query: string, schoolId?: string, limit: number = 20): Promise<Student[]> {
    const filters: StudentFilters = {
      search: query,
      schoolId,
    };

    const result = await this.repository.findMany(filters, 1, limit);
    return result.students;
  }

  // Transfer student to different school
  async transferStudent(studentId: string, newSchoolId: string, transferReason?: string): Promise<Student | null> {
    const student = await this.repository.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    if (student.schoolId === newSchoolId) {
      throw new Error('Student is already in this school');
    }

    const oldSchoolId = student.schoolId;
    const updatedStudent = await this.repository.update(studentId, {
      schoolId: newSchoolId,
      status: 'transferred',
    });

    if (updatedStudent) {
      // Audit log
      await AuditLogger.logSystemAction(AuditAction.UPDATE, 'students', studentId, {
        transfer: true,
        oldSchoolId,
        newSchoolId,
        reason: transferReason,
      });

      // Send notification
      if (this.notificationService && updatedStudent.phone) {
        await this.notificationService.sendNotification({
          type: 'sms',
          phone: updatedStudent.phone,
          template: 'transfer_notification',
          data: {
            studentName: `${updatedStudent.firstName} ${updatedStudent.lastName}`,
            oldSchool: oldSchoolId,
            newSchool: newSchoolId,
          },
        });
      }
    }

    return updatedStudent;
  }

  // Graduate student
  async graduateStudent(studentId: string, graduationDate?: Date): Promise<Student | null> {
    const student = await this.repository.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    if (student.status === 'graduated') {
      throw new Error('Student is already graduated');
    }

    const updatedStudent = await this.repository.update(studentId, {
      status: 'graduated',
      graduationDate: graduationDate || new Date(),
    });

    if (updatedStudent) {
      // Audit log
      await AuditLogger.logSystemAction(AuditAction.UPDATE, 'students', studentId, {
        graduation: true,
        graduationDate: updatedStudent.graduationDate,
      });

      // Send graduation notification
      if (this.notificationService && updatedStudent.phone) {
        await this.notificationService.sendNotification({
          type: 'both',
          email: updatedStudent.email,
          phone: updatedStudent.phone,
          template: 'graduation',
          data: {
            studentName: `${updatedStudent.firstName} ${updatedStudent.lastName}`,
            graduationDate: updatedStudent.graduationDate?.toDateString(),
          },
        });
      }
    }

    return updatedStudent;
  }

  // Check if student exists
  async studentExists(id: string): Promise<boolean> {
    return await this.repository.exists(id);
  }

  async studentExistsByUserId(userId: string): Promise<boolean> {
    return await this.repository.existsByUserId(userId);
  }

  async studentExistsByEmail(email: string, excludeId?: string): Promise<boolean> {
    return await this.repository.existsByEmail(email, excludeId);
  }
}
