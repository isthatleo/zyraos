"use client";

import * as React from "react";

import { getTenantSubdomain } from "@/lib/tenant-routing";

export function TenantSubdomainRedirect() {
  React.useEffect(() => {
    const slug = getTenantSubdomain(window.location.hostname);
    if (!slug) return;
    const cleanPath = window.location.pathname.replace(new RegExp(`^/${slug}(?=/|$)`), "") || "/";
    if (cleanPath !== window.location.pathname) {
      window.location.replace(cleanPath === "/" || cleanPath === "/login" ? "/staff" : cleanPath);
      return;
    }
    if (window.location.pathname === "/" || window.location.pathname === "/login") {
      window.location.replace("/staff");
    }
  }, []);

  return null;
}
