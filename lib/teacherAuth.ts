// lib/teacherAuth.ts
export function getRoleFromHeaders(headers: Headers) {
  // prefer explicit x-user-role header; fallback to cookie
  const role = headers.get("x-user-role");
  if (role) return role;
  const cookie = headers.get("cookie") || "";
  const match = cookie.match(/(?:^|; )teacher_role=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

