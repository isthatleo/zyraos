export type SchoolDepartmentSeed = {
  id: string;
  name: string;
};

export const STANDARD_SCHOOL_DEPARTMENTS: SchoolDepartmentSeed[] = [
  { id: "administration", name: "Administration" },
  { id: "academic_affairs", name: "Academic Affairs" },
  { id: "student_affairs", name: "Student Affairs & Admissions" },
  { id: "examinations_records", name: "Examinations & Records" },
  { id: "finance", name: "Finance & Accounts" },
  { id: "human_resources", name: "Human Resources" },
  { id: "library", name: "Library" },
  { id: "canteen", name: "Canteen & Catering" },
  { id: "health_wellbeing", name: "Health & Wellbeing" },
  { id: "transport_boarding", name: "Transport & Boarding" },
  { id: "security_facilities", name: "Security & Facilities" },
  { id: "stores_inventory", name: "Stores & Inventory" },
  { id: "ict", name: "ICT" },
];

export function standardSchoolDepartments(adminDepartmentId?: string): SchoolDepartmentSeed[] {
  if (!adminDepartmentId) return STANDARD_SCHOOL_DEPARTMENTS;
  return STANDARD_SCHOOL_DEPARTMENTS.map((department) =>
    department.id === "administration" ? { ...department, id: adminDepartmentId } : department
  );
}
