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
  { id: "procurement_stores", name: "Procurement & Stores" },
  { id: "ict", name: "ICT" },
];

export const REDUNDANT_SCHOOL_DEPARTMENT_IDS = new Set([
  "admissions",
  "examinations",
  "registry",
  "health",
  "transport",
  "boarding",
  "security",
  "procurement",
  "inventory",
  "counseling",
  "sports",
  "maintenance",
  "alumni",
]);

export function standardSchoolDepartments(adminDepartmentId?: string): SchoolDepartmentSeed[] {
  if (!adminDepartmentId) return STANDARD_SCHOOL_DEPARTMENTS;
  return STANDARD_SCHOOL_DEPARTMENTS.map((department) =>
    department.id === "administration" ? { ...department, id: adminDepartmentId } : department
  );
}
