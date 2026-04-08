// Student types
export interface Student {
  id: string;
  userId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: Date;
  grade: string;
  enrollmentDate: Date;
  graduationDate?: Date;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    doctorName?: string;
    doctorPhone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentData {
  userId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: Date;
  grade: string;
  enrollmentDate?: Date;
  address?: Student['address'];
  emergencyContact?: Student['emergencyContact'];
  medicalInfo?: Student['medicalInfo'];
}

export interface UpdateStudentData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  grade?: string;
  status?: Student['status'];
  address?: Student['address'];
  emergencyContact?: Student['emergencyContact'];
  medicalInfo?: Student['medicalInfo'];
}

export interface StudentWithDetails extends Student {
  school?: {
    id: string;
    name: string;
    type: string;
  };
  parents?: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    relationship: string;
  }>;
  grades?: Array<{
    subject: string;
    grade: string;
    semester: string;
    year: number;
  }>;
  attendance?: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    percentage: number;
  };
}

export interface StudentFilters {
  schoolId?: string;
  grade?: string;
  status?: Student['status'];
  enrollmentYear?: number;
  search?: string;
}

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  byGrade: Record<string, number>;
  byStatus: Record<string, number>;
  averageAttendance: number;
  graduationRate: number;
}
