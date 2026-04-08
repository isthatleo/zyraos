// Student repository
import { db } from '../../drizzle';
import { students } from '../../drizzle/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { Student, CreateStudentData, UpdateStudentData, StudentFilters, StudentStats } from './student.types';

export class StudentRepository {
  // Create student
  async create(data: CreateStudentData): Promise<Student> {
    const now = new Date();
    const studentData = {
      ...data,
      enrollmentDate: data.enrollmentDate || now,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };

    const [student] = await db.insert(students).values(studentData).returning();
    return student;
  }

  // Get student by ID
  async findById(id: string): Promise<Student | null> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || null;
  }

  // Get student by user ID
  async findByUserId(userId: string): Promise<Student | null> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student || null;
  }

  // Get students with filters and pagination
  async findMany(
    filters: StudentFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ students: Student[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (filters.schoolId) {
      whereConditions.push(eq(students.schoolId, filters.schoolId));
    }

    if (filters.grade) {
      whereConditions.push(eq(students.grade, filters.grade));
    }

    if (filters.status) {
      whereConditions.push(eq(students.status, filters.status));
    }

    if (filters.enrollmentYear) {
      const startDate = new Date(filters.enrollmentYear, 0, 1);
      const endDate = new Date(filters.enrollmentYear + 1, 0, 1);
      whereConditions.push(sql`${students.enrollmentDate} >= ${startDate} AND ${students.enrollmentDate} < ${endDate}`);
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push(
        or(
          like(students.firstName, searchTerm),
          like(students.lastName, searchTerm),
          like(students.email, searchTerm)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);

    // Get paginated results
    const studentList = await db
      .select()
      .from(students)
      .where(whereClause)
      .orderBy(students.createdAt)
      .limit(limit)
      .offset(offset);

    return {
      students: studentList,
      total: count,
      page,
      limit,
    };
  }

  // Update student
  async update(id: string, data: UpdateStudentData): Promise<Student | null> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const [updatedStudent] = await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, id))
      .returning();

    return updatedStudent || null;
  }

  // Delete student
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.id, id));
    return result.rowCount > 0;
  }

  // Get students by school
  async findBySchool(schoolId: string): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.schoolId, schoolId));
  }

  // Get students by grade
  async findByGrade(grade: string, schoolId?: string): Promise<Student[]> {
    const whereClause = schoolId
      ? and(eq(students.grade, grade), eq(students.schoolId, schoolId))
      : eq(students.grade, grade);

    return await db.select().from(students).where(whereClause);
  }

  // Get student statistics
  async getStats(schoolId?: string): Promise<StudentStats> {
    const whereClause = schoolId ? eq(students.schoolId, schoolId) : undefined;

    // Get total counts
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);

    const [activeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause ? and(whereClause, eq(students.status, 'active')) : eq(students.status, 'active'));

    // Get grade distribution
    const gradeResults = await db
      .select({
        grade: students.grade,
        count: sql<number>`count(*)`,
      })
      .from(students)
      .where(whereClause)
      .groupBy(students.grade);

    // Get status distribution
    const statusResults = await db
      .select({
        status: students.status,
        count: sql<number>`count(*)`,
      })
      .from(students)
      .where(whereClause)
      .groupBy(students.status);

    // Calculate average attendance (placeholder - would need attendance table)
    const averageAttendance = 85.5; // Placeholder

    // Calculate graduation rate (placeholder)
    const graduationRate = 92.3; // Placeholder

    const byGrade: Record<string, number> = {};
    gradeResults.forEach(result => {
      byGrade[result.grade] = result.count;
    });

    const byStatus: Record<string, number> = {};
    statusResults.forEach(result => {
      byStatus[result.status] = result.count;
    });

    return {
      totalStudents: totalResult.count,
      activeStudents: activeResult.count,
      byGrade,
      byStatus,
      averageAttendance,
      graduationRate,
    };
  }

  // Bulk operations
  async bulkCreate(data: CreateStudentData[]): Promise<Student[]> {
    const now = new Date();
    const studentData = data.map(item => ({
      ...item,
      enrollmentDate: item.enrollmentDate || now,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    }));

    return await db.insert(students).values(studentData).returning();
  }

  async bulkUpdate(updates: Array<{ id: string; data: UpdateStudentData }>): Promise<Student[]> {
    const results: Student[] = [];

    for (const update of updates) {
      const student = await this.update(update.id, update.data);
      if (student) {
        results.push(student);
      }
    }

    return results;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await db.delete(students).where(sql`${students.id} IN ${ids}`);
    return result.rowCount;
  }

  // Check existence
  async exists(id: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.id, id));

    return result.count > 0;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.userId, userId));

    return result.count > 0;
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const whereClause = excludeId
      ? and(eq(students.email, email), sql`${students.id} != ${excludeId}`)
      : eq(students.email, email);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);

    return result.count > 0;
  }
}
