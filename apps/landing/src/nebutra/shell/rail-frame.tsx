"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { pageAt } from "@/site-map";

/**
 * Rail, page, footer. A page the site map marks `chrome: "bare"` (the status
 * page) draws its own frame and gets none.
 */
export function RailFrame({
  nav,
  mobileNav,
  footer,
  children,
}: {
  nav: ReactNode;
  /** The phone top bar; the rail itself is hidden below lg. */
  mobileNav: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  if (pageAt(usePathname())?.chrome === "bare") return children;
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        {mobileNav}
        <div className="flex-1">{children}</div>
        {footer}
      </div>
    </div>
  );
}
