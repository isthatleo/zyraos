"use client";

import type * as React from "react";
import { useSearchParams } from "next/navigation";

export function LoginSearchParams({ children }: { children: (role?: string) => React.ReactNode }) {
  const searchParams = useSearchParams();
  return children(searchParams?.get("role") || undefined);
}
