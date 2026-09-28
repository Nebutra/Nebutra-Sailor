"use client";

import type { ReactNode } from "react";
import { PageTransition } from "@/components/site-shell/page-transition";
import { usePathname } from "@/i18n/navigation";
import { pageAt } from "@/site-map";

/**
 * Top bar, page, footer. The navigation lives in a drawer the header owns, so
 * the page always gets the full width. A page the site map marks
 * `chrome: "bare"` (the status page) draws its own frame and gets none.
 */
export function RailFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  if (pageAt(usePathname())?.chrome === "bare") return children;
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {header}
      <PageTransition>{children}</PageTransition>
      {footer}
    </div>
  );
}
