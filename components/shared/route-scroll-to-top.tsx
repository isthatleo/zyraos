"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  return null;
}
