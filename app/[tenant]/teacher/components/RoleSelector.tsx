// app/[tenant]/teacher/components/RoleSelector.tsx
"use client";
import React from "react";

const ROLES = [
  { value: "primary_teacher", label: "Primary Teacher" },
  { value: "secondary_teacher", label: "Secondary Teacher" },
  { value: "lecturer", label: "Lecturer" },
  { value: "professor", label: "Professor" },
];

export default function RoleSelector({ initialRole, onChange }: { initialRole?: string | null; onChange: (r: string) => void }) {
  const [role, setRole] = React.useState(initialRole ?? "primary_teacher");

  React.useEffect(() => {
    onChange(role);
    // store cookie
    document.cookie = `teacher_role=${encodeURIComponent(role)}; path=/`;
  }, []);

  function onSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    setRole(e.target.value);
    onChange(e.target.value);
    document.cookie = `teacher_role=${encodeURIComponent(e.target.value)}; path=/`;
  }

  return (
    <select value={role} onChange={onSelect}>
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

