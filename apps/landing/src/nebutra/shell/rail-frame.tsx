"use client";

import type { ReactNode } from "react";
import { PageTransition } from "@/components/site-shell/page-transition";
import { usePathname } from "@/i18n/navigation";
import { pageAt } from "@/site-map";

/**
 * Top bar, page, footer. The navigation lives in a drawer the header owns, so
 * the page always gets the full width. A page the site map marks
 * `chrome: "bare"` (the status page) draws its own frame and gets none; a
 * `chrome: "tool"` page (Sailor Studio) gets the top bar and the rest of the
 * viewport — no footer, and the document itself never scrolls. The status
 * pages' layout passes no footer at all.
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
  const chrome = pageAt(usePathname())?.chrome;
  if (chrome === "bare") return children;
  if (chrome === "tool") {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        {header}
        <PageTransition className="flex min-h-0 flex-1 flex-col">{children}</PageTransition>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {header}
      <PageTransition>{children}</PageTransition>
      {footer}
    </div>
  );
}
