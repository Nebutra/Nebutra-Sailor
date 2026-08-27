"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Next.js soft-nav keeps scroll when only searchParams change
 * (e.g. /works?page=1 → /works?page=2). Pagination should jump to top.
 */
export function ScrollToTopOnNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    // Instant jump — avoid smooth scroll fighting sticky filter / GSAP
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, query]);

  return null;
}
